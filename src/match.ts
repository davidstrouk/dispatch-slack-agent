import type { Match, NeedClassification, Precedent, Volunteer } from "./types.js";

// ── T-16/T-17: the precedent BIASES who gets picked (not just decoration) ──
// If a roster candidate matches the RTS-recalled precedent author, they win — that's
// the "judgment grounded in workspace history" judges feel. Then compose the reason line.
export function buildMatch(
  candidates: Volunteer[],
  precedent: Precedent | null,
  need: NeedClassification,
): Match | null {
  if (candidates.length === 0) return null;

  const referenced = referencedVolunteer(precedent, candidates);

  // Fairness guard: honor precedent for continuity, but rotate away if that volunteer is
  // already carrying a recent load and someone else can take it (avoids burning out reliables).
  const rotate =
    !!referenced?.recentlyAssigned && candidates.some((c) => c.name !== referenced.name);
  const pick = rotate
    ? candidates.find((c) => c.name !== referenced!.name)!
    : referenced ?? candidates[0];

  const clauses = [`available ${pick.availabilityWindow}`, `${pick.distanceMi} mi away`];
  if (referenced && pick.name === referenced.name) {
    clauses.push(`already handled this exact ${need.need_type} request before`);
  } else if (rotate) {
    clauses.push(`rotating in to spare ${referenced!.name}, who usually takes these`);
  } else if (precedent && !precedent.isAuthorBot) {
    clauses.push(`workspace history shows ${precedent.authorName} handled a similar request`);
  }

  return { volunteer: pick, reason: clauses.join(" · "), precedent };
}

// The recalled precedent identifies its volunteer by author (offline corpus) OR by name
// mentioned in the message text (live RTS, where the author is the seeding bot).
function referencedVolunteer(
  precedent: Precedent | null,
  candidates: Volunteer[],
): Volunteer | undefined {
  if (!precedent) return undefined;
  return (
    candidates.find((c) => c.name === precedent.authorName) ??
    candidates.find((c) => precedent.content.includes(c.name))
  );
}
