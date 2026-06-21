import { test } from "node:test";
import assert from "node:assert/strict";
import type { WebClient } from "@slack/web-api";
import { recallPrecedent, recallPrecedentFallback } from "./rts.js";

// Inject a fake Slack client returning a canned assistant.search.context response.
const clientReturning = (messages: unknown[]): WebClient =>
  ({ apiCall: async () => ({ ok: true, results: { messages } }) }) as unknown as WebClient;

test("RTS skips empty-content hits and returns the first populated one", async () => {
  const client = clientReturning([
    { author_name: "dispatch", content: "", permalink: "p1", channel_name: "mutual-aid", message_ts: "1", is_author_bot: true },
    { author_name: "dispatch", content: "Maria R. drove to dialysis", permalink: "p2", channel_name: "mutual-aid", message_ts: "2", is_author_bot: true },
  ]);
  const p = await recallPrecedent(client, "dialysis");
  assert.equal(p?.content, "Maria R. drove to dialysis");
  assert.equal(p?.permalink, "p2");
  assert.equal(p?.isAuthorBot, true);
});

test("RTS returns null when every hit has empty content", async () => {
  const client = clientReturning([
    { author_name: "x", content: "", permalink: "p", channel_name: "c", message_ts: "1" },
  ]);
  assert.equal(await recallPrecedent(client, "q"), null);
});

test("RTS excludes the triggering message itself by ts (no self-match)", async () => {
  const client = clientReturning([
    { author_name: "user", content: "drive to dialysis", permalink: "self", channel_name: "mutual-aid", message_ts: "100" },
    { author_name: "dispatch", content: "Maria R. drove to dialysis", permalink: "p2", channel_name: "mutual-aid", message_ts: "50", is_author_bot: true },
  ]);
  const p = await recallPrecedent(client, "drive to dialysis", { excludeTs: "100" });
  assert.equal(p?.permalink, "p2");
});

test("RTS prefers Dispatch's resolution records (bot) over stray user pleas", async () => {
  const client = clientReturning([
    { author_name: "someone", content: "can anyone help with a dialysis ride?", permalink: "plea", channel_name: "mutual-aid", message_ts: "200", is_author_bot: false },
    { author_name: "dispatch", content: "Maria R. drove the Chen family to dialysis", permalink: "ledger", channel_name: "mutual-aid", message_ts: "50", is_author_bot: true },
  ]);
  const p = await recallPrecedent(client, "dialysis ride");
  assert.equal(p?.permalink, "ledger");
});

test("RTS scopes the search to the channel when channelId is given", async () => {
  let sentQuery = "";
  const client = {
    apiCall: async (_m: string, args: any) => {
      sentQuery = args.query;
      return { ok: true, results: { messages: [] } };
    },
  } as unknown as WebClient;
  await recallPrecedent(client, "dialysis", { channelId: "C0BCWEJTCAC" });
  assert.match(sentQuery, /in:<#C0BCWEJTCAC>/);
});

// The seeded corpus has no precomputed embeddings, so recallPrecedentFallback uses the
// keyword path. embed() is never called — pass a stub that throws to prove that.
const noEmbed = async (): Promise<number[]> => {
  throw new Error("embed must not be called when the corpus has no embeddings");
};

test("recalls the dialysis precedent (Maria) for a dialysis plea", async () => {
  const p = await recallPrecedentFallback(noEmbed, "can anyone drive my mom to dialysis tomorrow");
  assert.equal(p?.authorName, "Maria R.");
});

test("recalls the formula precedent (Tomas) for a baby-formula plea", async () => {
  const p = await recallPrecedentFallback(noEmbed, "we urgently need baby formula and diapers dropped off");
  assert.equal(p?.authorName, "Tomas L.");
});

test("specific terms beat filler — 'dialysis' still wins amid stopwords", async () => {
  const p = await recallPrecedentFallback(
    noEmbed,
    "is there anyone out there who could possibly give a ride to dialysis",
  );
  assert.equal(p?.authorName, "Maria R.");
});

test("returns null when the query shares no content words with any thread", async () => {
  const p = await recallPrecedentFallback(noEmbed, "xylophone quantum spaceship");
  assert.equal(p, null);
});
