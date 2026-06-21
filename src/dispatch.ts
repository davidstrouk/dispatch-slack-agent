import { buildMatch } from "./match.js";
import { escalationPing } from "./escalation.js";
import type { Match, NeedClassification, Precedent, Volunteer } from "./types.js";

export interface RecallCtx { channelId?: string; excludeTs?: string; actionToken?: string }

export interface DispatchDeps {
  classify: (text: string) => Promise<NeedClassification>;
  queryRoster: (needType: string) => Promise<Volunteer[]>;
  recallPrecedent: (text: string, ctx: RecallCtx) => Promise<Precedent | null>;
}

export interface DispatchResult {
  need: NeedClassification;
  candidates: Volunteer[];
  precedent: Precedent | null;
  match: Match | null;
  ping: string | null;
}

// Shared core used by BOTH the channel handler and the Assistant pane.
export async function dispatchRequest(deps: DispatchDeps, text: string, ctx: RecallCtx): Promise<DispatchResult> {
  const precedentP = deps.recallPrecedent(text, ctx); // independent of classification — run concurrently
  const need = await deps.classify(text);
  const candidates = await deps.queryRoster(need.need_type);
  const precedent = await precedentP;
  const match = buildMatch(candidates, precedent, need);
  const ping = escalationPing(need);
  return { need, candidates, precedent, match, ping };
}
