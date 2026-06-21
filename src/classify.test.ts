import { test } from "node:test";
import assert from "node:assert/strict";

delete process.env.LLM_API_KEY; // force the heuristic path — no network in tests
const { classify } = await import("./classify.js");

test("routes a ride request to transport", async () => {
  assert.equal((await classify("can someone drive me to my appointment")).need_type, "transport");
});

test("routes a food request to groceries", async () => {
  assert.equal((await classify("we need groceries and baby formula")).need_type, "groceries");
});

test("routes a babysitting request to childcare", async () => {
  assert.equal((await classify("need someone to babysit my kid")).need_type, "childcare");
});

test("routes a prescription request to medical", async () => {
  assert.equal((await classify("can anyone pick up a prescription from the pharmacy")).need_type, "medical");
});

test("falls back to 'other' for an unrecognized need", async () => {
  assert.equal((await classify("looking for general advice on something")).need_type, "other");
});

test("marks urgency high when the request is time-critical", async () => {
  assert.equal((await classify("need a ride tomorrow morning")).urgency, "high");
});
