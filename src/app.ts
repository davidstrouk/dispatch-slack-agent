import "dotenv/config";
import boltPkg from "@slack/bolt";
import { recallPrecedent, recallPrecedentFallback } from "./rts.js";
import { makeRosterClient, queryRoster } from "./mcp-client.js";
import { classify } from "./classify.js";
import { buildMatch } from "./match.js";
import { assignmentCard } from "./card.js";
import { FAKE_PRECEDENT } from "./fakes.js";
import { embed } from "./embed.js";

const { App } = boltPkg;
const USE_FAKES = process.env.USE_FAKES === "true";
const CHANNEL = process.env.DISPATCH_CHANNEL_ID;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

const roster = await makeRosterClient();

// ── T-19: new help request → classify (Slack AI) → roster (MCP) → precedent (RTS) → card ──
app.message(async ({ message, client, say, logger }) => {
  const m = message as any;
  if (m.subtype || !m.text || (CHANNEL && m.channel !== CHANNEL)) return;

  const need = await classify(m.text); // T-11
  const candidates = await queryRoster(roster, need.need_type); // T-14

  const precedent = USE_FAKES
    ? FAKE_PRECEDENT
    : (await recallPrecedent(client, m.text, m.action_token).catch(() => null)) ?? // T-08
      (await recallPrecedentFallback(embed, m.text).catch(() => null)); // T-09

  const match = buildMatch(candidates, precedent, need); // T-16/17
  if (!match) {
    await say(`No available volunteer for *${need.need_type}* right now.`);
    return;
  }

  await say(assignmentCard(need, match)); // T-18
  logger.info(`Dispatched ${need.need_type} → ${match.volunteer.name}`);
});

// ── Cut-on-slip (T-21): Accept flips the card to "On it" ──
app.action("accept_assignment", async ({ ack, body, respond }) => {
  await ack();
  const name = (body as any).actions[0].value;
  await respond({ replace_original: true, text: `✅ *On it* — ${name} accepted the request.` });
});

app.action("reassign", async ({ ack }) => {
  await ack(); // cut-on-slip: re-run match excluding current pick (T-20)
});

await app.start();
console.log("⚡️ Dispatch is listening" + (USE_FAKES ? " (USE_FAKES on)" : ""));
