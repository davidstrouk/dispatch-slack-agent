import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { WebClient } from "@slack/web-api";

// Posts the seeded past-request history into DISPATCH_CHANNEL_ID so RTS has real
// workspace context to recall. Bot-authored; volunteers are named in the TEXT (not the
// author), which is what buildMatch links against.  Run once:  npm run seed
const __dirname = dirname(fileURLToPath(import.meta.url));
const messages: string[] = JSON.parse(
  readFileSync(join(__dirname, "seed", "sandbox-seed.json"), "utf8"),
);

const channel = process.env.DISPATCH_CHANNEL_ID;
if (!channel) {
  console.error("Set DISPATCH_CHANNEL_ID in .env first.");
  process.exit(1);
}
const client = new WebClient(process.env.SLACK_BOT_TOKEN);

let ok = 0;
for (const text of messages) {
  try {
    const res = await client.chat.postMessage({ channel, text });
    if (res.ok) ok++;
    console.log(res.ok ? `posted ${res.ts}` : `FAILED: ${JSON.stringify(res)}`);
  } catch (e: any) {
    console.error(`ERROR posting: ${e?.data?.error ?? e?.message ?? e}`);
  }
}
console.log(`done — ${ok}/${messages.length} messages seeded into ${channel}`);
