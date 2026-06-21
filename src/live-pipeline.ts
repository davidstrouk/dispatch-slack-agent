import "dotenv/config";
import { WebClient } from "@slack/web-api";
import { makeRosterClient, queryRoster } from "./mcp-client.js";
import { recallPrecedent } from "./rts.js";
import { classify } from "./classify.js";
import { buildMatch } from "./match.js";
import { assignmentCard } from "./card.js";

// Runs the FULL product pipeline against LIVE RTS (no Bolt/Socket Mode), to prove the card
// is built from real recalled workspace history.
//   npx tsx src/live-pipeline.ts "Can anyone drive my mom to dialysis tomorrow 9am?"
const plea =
  process.argv.slice(2).join(" ") ||
  "Can anyone drive my mom to dialysis tomorrow 9am? We have no car and she can't take the bus.";

const rts = new WebClient(process.env.SLACK_USER_TOKEN);
const roster = await makeRosterClient();

const need = await classify(plea);
const candidates = await queryRoster(roster, need.need_type);
const precedent = await recallPrecedent(rts, plea); // LIVE RTS — assistant.search.context
const match = buildMatch(candidates, precedent, need);

console.log("PLEA:          ", plea);
console.log("NEED:          ", need);
console.log("CANDIDATES:    ", candidates.map((c) => `${c.name} (${c.distanceMi}mi)`));
console.log("LIVE PRECEDENT:", precedent && {
  authorName: precedent.authorName,
  isAuthorBot: precedent.isAuthorBot,
  channel: precedent.channelName,
  content: precedent.content,
});
console.log("CARD TEXT:     ", match && assignmentCard(need, match).text);
process.exit(0);
