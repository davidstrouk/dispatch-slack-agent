import "dotenv/config";
import { makeRosterClient, queryRoster } from "./mcp-client.js";
import { recallPrecedentFallback } from "./rts.js";
import { embed } from "./embed.js";
import { classify } from "./classify.js";
import { buildMatch } from "./match.js";
import { assignmentCard } from "./card.js";

// End-to-end pipeline check MINUS Slack: classify → MCP roster → precedent → match → card.
//   npm run smoke -- "can anyone drive my mom to dialysis tomorrow 9am"
const text =
  process.argv.slice(2).join(" ") ||
  "can anyone drive my mom to dialysis tomorrow 9am, we have no car";

const roster = await makeRosterClient();
const need = await classify(text);
const candidates = await queryRoster(roster, need.need_type);
const precedent = await recallPrecedentFallback(embed, text).catch(() => null);
const match = buildMatch(candidates, precedent, need);

console.log("NEED:      ", need);
console.log("CANDIDATES:", candidates.map((c) => `${c.name} (${c.distanceMi}mi)`));
console.log("MATCH:     ", match && { volunteer: match.volunteer.name, reason: match.reason });
console.log("CARD TEXT: ", match && assignmentCard(need, match).text);
process.exit(match ? 0 : 1);
