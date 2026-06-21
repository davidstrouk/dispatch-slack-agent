import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatchRequest } from "./dispatch.js";
import type { NeedClassification, Precedent, Volunteer } from "./types.js";

const maria: Volunteer = { name: "Maria R.", available: true, availabilityWindow: "tomorrow AM", skills: ["transport"], distanceMi: 1.2, pastHandled: [] };
const precedent: Precedent = { authorName: "dispatch", content: "Maria R. drove the Chen family to dialysis", permalink: "p", channelName: "mutual-aid", ts: "1", isAuthorBot: true };

const deps = {
  classify: async (): Promise<NeedClassification> => ({ need_type: "transport", urgency: "high", summary: "ride" }),
  queryRoster: async () => [maria],
  recallPrecedent: async () => precedent,
};

test("dispatchRequest assembles need, match (precedent-linked), and escalation ping", async () => {
  const r = await dispatchRequest(deps, "drive my mom to dialysis", { channelId: "C1", excludeTs: "9" });
  assert.equal(r.need.need_type, "transport");
  assert.equal(r.match?.volunteer.name, "Maria R.");
  assert.match(r.match!.reason, /already handled this exact transport request before/);
  assert.match(r.ping ?? "", /@here/);
});

test("dispatchRequest passes channel scope + excludeTs through to recall", async () => {
  let seen: any = null;
  await dispatchRequest({ ...deps, recallPrecedent: async (_t, ctx) => { seen = ctx; return null; } }, "x", { channelId: "C9", excludeTs: "5" });
  assert.deepEqual(seen, { channelId: "C9", excludeTs: "5" });
});

test("dispatchRequest reports progress between steps in order", async () => {
  const maria2 = { name: "Maria R.", available: true, availabilityWindow: "tomorrow AM", skills: ["transport"], distanceMi: 1.2, pastHandled: [] };
  const statuses: string[] = [];
  await dispatchRequest(
    {
      classify: async () => ({ need_type: "transport", urgency: "high", summary: "x" }),
      queryRoster: async () => [maria2],
      recallPrecedent: async () => null,
    },
    "drive to dialysis",
    {},
    (s) => { statuses.push(s); },
  );
  assert.equal(statuses.length, 3);
  assert.match(statuses[0], /Reading the request/i);
  assert.match(statuses[1], /Need: transport/);
  assert.match(statuses[2], /Searching workspace history/i);
});
