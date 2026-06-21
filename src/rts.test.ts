import { test } from "node:test";
import assert from "node:assert/strict";
import { recallPrecedentFallback } from "./rts.js";

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
