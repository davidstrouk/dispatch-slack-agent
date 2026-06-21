import { encodeAcceptValue } from "./resolution.js";
import type { Match, NeedClassification } from "./types.js";

const URGENCY_EMOJI: Record<string, string> = {
  low: "🟢",
  medium: "🟡",
  high: "🟠",
  critical: "🔴",
};

// ── T-18: the assignment card — THE protected wow moment, rendered ──
// classification chip + assigned volunteer + the highlighted RTS precedent clause.
export function assignmentCard(need: NeedClassification, match: Match) {
  const v = match.volunteer;
  const precedentLine = match.precedent
    ? `🧠 *Recalled from this workspace:* ${match.precedent.authorName} — <${match.precedent.permalink}|${truncate(match.precedent.content, 80)}>`
    : "_No prior precedent found in workspace history._";

  return {
    text: `Assigned ${v.name} — ${match.reason}`, // notification fallback
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${URGENCY_EMOJI[need.urgency] ?? "⚪️"} *${need.need_type.toUpperCase()}* · urgency *${need.urgency}*`,
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Assigned ▸ ${v.name}*\n${match.reason}` },
      },
      { type: "context", elements: [{ type: "mrkdwn", text: precedentLine }] },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            action_id: "accept_assignment",
            style: "primary",
            text: { type: "plain_text", text: "Accept" },
            value: encodeAcceptValue(v.name, need.need_type, need.summary),
          },
          {
            type: "button",
            action_id: "reassign",
            text: { type: "plain_text", text: "Reassign" },
            value: v.name,
          },
        ],
      },
    ],
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
