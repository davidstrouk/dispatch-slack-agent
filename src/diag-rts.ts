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

const items = res?.results?.messages ?? res?.results ?? [];
console.log(`QUERY: ${query}`);
console.log(`RANKED RESULTS (${items.length}):`);
items.forEach((m: any, i: number) => {
  console.log(`  #${i + 1}  [${m.channel_name}] ${m.author_name}: ${String(m.content).slice(0, 70)}`);
});
