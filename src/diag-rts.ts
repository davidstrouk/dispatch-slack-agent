import "dotenv/config";
import { WebClient } from "@slack/web-api";

// DIAGNOSTIC (Phase 1 evidence) — dump the raw assistant.search.context response so we can
// see the TRUE field names and whether message text lives in `content`, `text`, or context.
//   npx tsx src/diag-rts.ts "ride to dialysis appointment"
const query = process.argv.slice(2).join(" ") || "ride to dialysis appointment";
const token = process.env.SLACK_USER_TOKEN ?? process.env.SLACK_BOT_TOKEN;
const client = new WebClient(token);

const res: any = await client.apiCall("assistant.search.context", {
  query,
  content_types: ["messages"],
  channel_types: ["public_channel"],
  limit: 3,
  include_context_messages: true, // turn ON to see if text appears here
});

console.log("TOP-LEVEL KEYS:", Object.keys(res));
console.log("results type:", Array.isArray(res.results) ? "array" : typeof res.results);
console.log("results KEYS:", res.results && !Array.isArray(res.results) ? Object.keys(res.results) : "(n/a)");

const items = res?.results?.messages ?? res?.results ?? [];
console.log("ITEM COUNT:", Array.isArray(items) ? items.length : "(not array)");
console.log("FIRST ITEM FIELD NAMES:", items[0] ? Object.keys(items[0]) : "(none)");
console.log("FIRST ITEM (raw):");
console.log(JSON.stringify(items[0], null, 2));
