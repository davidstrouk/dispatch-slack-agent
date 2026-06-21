import type { NeedClassification } from "./types.js";

// Cut-on-slip feature (T-22): for urgent requests, return an @here ping to post
// alongside the assignment card so the channel sees it immediately. Pure + testable.
export function escalationPing(need: NeedClassification): string | null {
  switch (need.urgency) {
    case "critical":
      return `🚨 @here — CRITICAL ${need.need_type} request needs a volunteer now.`;
    case "high":
      return `@here — urgent ${need.need_type} request, can anyone help?`;
    default:
      return null;
  }
}
