import "dotenv/config";
import boltPkg from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { recallPrecedent, recallPrecedentFallback } from "./rts.js";
import { makeRosterClient, queryRoster } from "./mcp-client.js";
import { classify } from "./classify.js";
import { assignmentCard } from "./card.js";
import { dispatchRequest, type RecallCtx } from "./dispatch.js";
import { makeAssistant } from "./assistant.js";
import { parseAcceptValue, resolutionRecord } from "./resolution.js";
import { FAKE_PRECEDENT } from "./fakes.js";
import { embed } from "./embed.js";

const { App } = boltPkg;
const USE_FAKES = process.env.USE_FAKES === "true";
const CHANNEL = process.env.DISPATCH_CHANNEL_ID;
if (!CHANNEL) {
  console.warn(
    "⚠️  DISPATCH_CHANNEL_ID is unset — RTS recall will be UNSCOPED (cross-channel/self-match risk). Set it to your community channel.",
  );
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

const roster = await makeRosterClient();

// RTS prefers a user token (search:read.public — no action_token needed); fall back to the
// bot client (which needs the event's action_token).
const rtsClient = process.env.SLACK_USER_TOKEN ? new WebClient(process.env.SLACK_USER_TOKEN) : null;

// RTS precedent recall (live → fallback), isolated so it can run concurrently with classify.
async function getPrecedent(client: WebClient, text: string, ctx: RecallCtx) {
  if (USE_FAKES) return FAKE_PRECEDENT;
  const search = rtsClient ?? client;
  return (
    (await recallPrecedent(search, text, ctx).catch(() => null)) ?? // T-08
    (await recallPrecedentFallback(embed, text).catch(() => null)) // T-09
  );
}

// Shared deps (DRY) used by BOTH the channel handler and the Assistant pane.
// app.client (bot token) is passed to getPrecedent — behavior-equivalent because rtsClient
// (user token) performs RTS regardless of the passed client.
const deps = {
  classify,
  queryRoster: (nt: string) => queryRoster(roster, nt),
  recallPrecedent: (text: string, ctx: RecallCtx) => getPrecedent(app.client, text, ctx),
};
app.assistant(makeAssistant(deps, process.env.DISPATCH_CHANNEL_ID));

// ── T-19: new help request → classify (Slack AI) → roster (MCP) → precedent (RTS) → card ──
app.message(async ({ message, say, logger }) => {
  const m = message as any;
  // R-05: skip the bot's own posts, edits/joins (subtype), empty text, and other channels.
  if (m.subtype || m.bot_id || !m.text || (CHANNEL && m.channel !== CHANNEL)) return;

  const { need, match, ping } = await dispatchRequest(
    deps,
    m.text,
    { channelId: m.channel, excludeTs: m.ts, actionToken: m.action_token },
  );

  if (!match) {
    await say(`No available volunteer for *${need.need_type}* right now.`);
    return;
  }

  if (ping) await say(ping); // T-22: notify the channel on urgent requests
  await say(assignmentCard(need, match)); // T-18
  logger.info(`Dispatched ${need.need_type} → ${match.volunteer.name}`);
});

// ── Accept: flip the card to "On it" AND close the ledger loop ──
// Posts a "✅ Resolved:" record to #mutual-aid so today's assignment becomes a future
// RTS-recalled precedent for the next similar request.
app.action("accept_assignment", async ({ ack, body, client, respond }) => {
  await ack();
  const ctx = parseAcceptValue((body as any).actions[0].value);
  await respond({ replace_original: true, text: `✅ *On it* — ${ctx.volunteer} accepted the request.` });
  if (CHANNEL) {
    await client.chat
      .postMessage({ channel: CHANNEL, text: resolutionRecord(ctx) })
      .catch((e) => console.error("resolution post failed:", e));
  }
});

app.action("reassign", async ({ ack }) => {
  await ack(); // cut-on-slip: re-run match excluding current pick (T-20)
});

await app.start();
console.log("⚡️ Dispatch is listening" + (USE_FAKES ? " (USE_FAKES on)" : ""));
