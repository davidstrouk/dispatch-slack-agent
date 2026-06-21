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

export type ProgressFn = (status: string) => void | Promise<void>;

// Shared core used by BOTH the channel handler and the Assistant pane.
// `onProgress` is optional — the Assistant pane threads it through to narrate each
// step BETWEEN the real awaits; the channel handler passes nothing and is unchanged.
export async function dispatchRequest(
  deps: DispatchDeps,
  text: string,
  ctx: RecallCtx,
  onProgress?: ProgressFn,
): Promise<DispatchResult> {
  await onProgress?.("Reading the request…");
  const precedentP = deps.recallPrecedent(text, ctx); // independent of classification — run concurrently
  const need = await deps.classify(text);
  await onProgress?.(`Need: ${need.need_type} · urgency ${need.urgency} — finding volunteers…`);
  const candidates = await deps.queryRoster(need.need_type);
  await onProgress?.("Searching workspace history for who's helped before…");
  const precedent = await precedentP;
  const match = buildMatch(candidates, precedent, need);
  const ping = escalationPing(need);
  return { need, candidates, precedent, match, ping };
}
