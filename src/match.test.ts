import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMatch } from "./match.js";
import type { NeedClassification, Precedent, Volunteer } from "./types.js";

const need: NeedClassification = { need_type: "transport", urgency: "high", summary: "ride" };

const maria: Volunteer = {
  name: "Maria R.", available: true, availabilityWindow: "tomorrow AM",
  skills: ["transport"], distanceMi: 1.2, pastHandled: ["dialysis transport"],
};
const devon: Volunteer = {
  name: "Devon K.", available: true, availabilityWindow: "today",
  skills: ["transport"], distanceMi: 4.8, pastHandled: [],
};

const precedentFor = (name: string): Precedent => ({
  authorName: name, content: "drove to dialysis", permalink: "https://x/y",
  channelName: "mutual-aid", ts: "1.0",
});

test("precedent biases the pick toward the volunteer who did it before", () => {
  // Devon is closer (would win on distance), but Maria is the precedent author.
  const match = buildMatch([devon, maria], precedentFor("Maria R."), need);
  assert.equal(match?.volunteer.name, "Maria R.");
  assert.match(match!.reason, /already handled this exact transport request before/);
});

test("fairness guard rotates away from an overloaded precedent volunteer", () => {
  const tiredMaria: Volunteer = { ...maria, recentlyAssigned: true };
  const match = buildMatch([tiredMaria, devon], precedentFor("Maria R."), need);
  assert.equal(match?.volunteer.name, "Devon K.");
  assert.match(match!.reason, /rotating in to spare Maria R\./);
});

test("does NOT rotate when the overloaded precedent volunteer is the only candidate", () => {
  const tiredMaria: Volunteer = { ...maria, recentlyAssigned: true };
  const match = buildMatch([tiredMaria], precedentFor("Maria R."), need);
  assert.equal(match?.volunteer.name, "Maria R.");
});

test("falls back to the first candidate when there is no precedent", () => {
  const match = buildMatch([devon, maria], null, need);
  assert.equal(match?.volunteer.name, "Devon K.");
  assert.doesNotMatch(match!.reason, /handled|rotating/);
});

test("notes a similar-request precedent when its author isn't on the roster", () => {
  const match = buildMatch([devon], precedentFor("Grace M."), need);
  assert.equal(match?.volunteer.name, "Devon K.");
  assert.match(match!.reason, /workspace history shows Grace M\. handled a similar request/);
});

test("returns null when there are no candidates", () => {
  assert.equal(buildMatch([], precedentFor("Maria R."), need), null);
});

test("links the precedent volunteer by name in content when the author is the bot", () => {
  // Live RTS returns author_name = the bot; the volunteer is named in the message text.
  const botPrecedent: Precedent = {
    authorName: "dispatch",
    content: "✅ Resolved: Maria R. drove the Chen family to their dialysis appointment last month.",
    permalink: "https://x/y", channelName: "mutual-aid", ts: "1.0", isAuthorBot: true,
  };
  // Devon is closer (would win on distance) but Maria is named in the recalled message.
  const match = buildMatch([devon, maria], botPrecedent, need);
  assert.equal(match?.volunteer.name, "Maria R.");
  assert.match(match!.reason, /already handled this exact transport request before/);
});

test("does not name the bot when the recalled message references no roster volunteer", () => {
  const botPrecedent: Precedent = {
    authorName: "dispatch",
    content: "✅ Resolved: someone helped a family move last week.",
    permalink: "https://x/y", channelName: "mutual-aid", ts: "1.0", isAuthorBot: true,
  };
  const match = buildMatch([devon], botPrecedent, need);
  assert.equal(match?.volunteer.name, "Devon K.");
  assert.doesNotMatch(match!.reason, /dispatch/);
});
