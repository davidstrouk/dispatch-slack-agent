import "dotenv/config";
import { WebClient } from "@slack/web-api";
import { recallPrecedent, recallPrecedentFallback } from "./rts.js";
import { embed } from "./embed.js";

// ── T-07/T-08/T-10 — run the GATE in isolation BEFORE building the rest ──
//   npm run spike -- "ride to dialysis tomorrow 9am"
// Exits non-zero on GATE FAIL so it's CI/script-friendly.
const query =
  process.argv.slice(2).join(" ") || "ride to dialysis appointment tomorrow morning";
const token = process.env.SLACK_USER_TOKEN ?? process.env.SLACK_BOT_TOKEN;

async function main() {
  let viaRts = null;
  if (token) {
    const client = new WebClient(token);
    viaRts = await recallPrecedent(client, query).catch((e) => {
      console.error("RTS error:", e.message);
      return null;
    });
  } else {
    console.error("No SLACK_USER_TOKEN/SLACK_BOT_TOKEN — testing fallback path only.");
  }

  const result = viaRts ?? (await recallPrecedentFallback(embed, query).catch(() => null));

  console.log("QUERY:   ", query);
  console.log("SOURCE:  ", viaRts ? "RTS (assistant.search.context)" : "fallback (embeddings/keyword)");
  console.log("PRECEDENT:", result ?? "∅ none found");
  if (result) {
    console.log("✅ GATE PASS — precedent recalled");
  } else {
    console.log("❌ GATE FAIL — tune the corpus or lower the threshold");
    process.exitCode = 1;
  }
}

main();
