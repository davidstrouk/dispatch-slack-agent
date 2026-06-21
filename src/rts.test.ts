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
