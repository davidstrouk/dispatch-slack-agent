import { test } from "node:test";
import assert from "node:assert/strict";
import { assignmentCard } from "./card.js";
import type { Match, NeedClassification, Volunteer } from "./types.js";

const need: NeedClassification = { need_type: "transport", urgency: "high", summary: "ride" };
const volunteer: Volunteer = {
  name: "Maria R.", available: true, availabilityWindow: "tomorrow AM",
  skills: ["transport"], distanceMi: 1.2, pastHandled: [],
};

test("card text names the volunteer and includes the reason", () => {
  const match: Match = { volunteer, reason: "available tomorrow AM · 1.2 mi away", precedent: null };
  const card = assignmentCard(need, match);
  assert.match(card.text, /Maria R\./);
  assert.match(card.text, /1\.2 mi away/);
});

test("card surfaces urgency and need type in a block", () => {
  const match: Match = { volunteer, reason: "x", precedent: null };
  const blocks = JSON.stringify(assignmentCard(need, match).blocks);
  assert.match(blocks, /TRANSPORT/);
  assert.match(blocks, /high/);
});

test("card shows the recalled precedent with a clickable permalink", () => {
  const match: Match = {
    volunteer, reason: "x",
    precedent: { authorName: "Maria R.", content: "drove to dialysis", permalink: "https://x/y", channelName: "mutual-aid", ts: "1.0" },
  };
  const blocks = JSON.stringify(assignmentCard(need, match).blocks);
  assert.match(blocks, /Recalled from this workspace/);
  assert.match(blocks, /https:\/\/x\/y/);
});

test("card notes when no precedent was found", () => {
  const match: Match = { volunteer, reason: "x", precedent: null };
  const blocks = JSON.stringify(assignmentCard(need, match).blocks);
  assert.match(blocks, /No prior precedent/);
});
