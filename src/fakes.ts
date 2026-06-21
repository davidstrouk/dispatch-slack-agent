import type { Precedent } from "./types.js";

// ── T-19: deterministic precedent for the one-take demo (USE_FAKES=true) ──
// Guarantees the wow lands on camera even if RTS is flaky on the day. Mirror this
// exactly in seed/past-requests.json so the live path produces the same result.
export const FAKE_PRECEDENT: Precedent = {
  authorName: "Maria R.",
  content:
    "Drove the Chen family to their dialysis appointment — happy to be their regular ride.",
  permalink: "https://app.slack.com/seed/chen-dialysis",
  channelName: "mutual-aid",
  ts: "1716950400.000000",
};
