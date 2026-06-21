import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeAcceptValue, parseAcceptValue, resolutionRecord } from "./resolution.js";

test("encode/parse round-trips the assignment context", () => {
  const v = encodeAcceptValue("Maria R.", "transport", "ride to dialysis");
  assert.deepEqual(parseAcceptValue(v), {
    volunteer: "Maria R.",
    need_type: "transport",
    summary: "ride to dialysis",
  });
});

test("parseAcceptValue falls back to a plain volunteer name (legacy buttons)", () => {
  assert.deepEqual(parseAcceptValue("Maria R."), { volunteer: "Maria R." });
});

test("resolutionRecord names the volunteer + need so RTS can recall it later", () => {
  const r = resolutionRecord({ volunteer: "Maria R.", need_type: "transport", summary: "ride to dialysis" });
  assert.match(r, /^✅ Resolved:/);
  assert.match(r, /Maria R\./);
  assert.match(r, /transport/);
  assert.match(r, /ride to dialysis/);
});

test("resolutionRecord degrades gracefully when context is just a name", () => {
  const r = resolutionRecord({ volunteer: "Maria R." });
  assert.match(r, /^✅ Resolved:/);
  assert.match(r, /Maria R\./);
});
