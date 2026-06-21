import { test } from "node:test";
import assert from "node:assert/strict";
import { escalationPing } from "./escalation.js";
import type { NeedClassification } from "./types.js";

const need = (urgency: NeedClassification["urgency"]): NeedClassification => ({
  need_type: "transport",
  urgency,
  summary: "ride needed",
});

test("pings @here on critical urgency", () => {
  const ping = escalationPing(need("critical"));
  assert.ok(ping, "expected a ping string for critical urgency");
  assert.match(ping, /@here/);
  assert.match(ping, /critical/i);
});

test("pings @here on high urgency", () => {
  const ping = escalationPing(need("high"));
  assert.ok(ping, "expected a ping string for high urgency");
  assert.match(ping, /@here/);
});

test("does not ping on medium urgency", () => {
  assert.equal(escalationPing(need("medium")), null);
});

test("does not ping on low urgency", () => {
  assert.equal(escalationPing(need("low")), null);
});
