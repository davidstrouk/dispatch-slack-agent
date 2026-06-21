import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { WebClient } from "@slack/web-api";
import type { Precedent } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface RecallOpts {
  actionToken?: string; // bot tokens require an action_token from the event; user tokens don't
  channelId?: string; // scope the search to one channel (avoids cross-channel noise)
  excludeTs?: string; // skip this message (the triggering plea) so it can't self-match
}

// ── T-07/T-08: Real-Time Search precedent recall (PRIMARY — build this first) ──
// Slack RTS API method: assistant.search.context (GA 2026-02-17).
// Live-verified: unscoped search returns unstable cross-channel matches and self-matches,
// so we scope to the channel via an `in:<#ID>` operator and exclude the triggering message.
export async function recallPrecedent(
  client: WebClient,
  query: string,
  opts: RecallOpts = {},
): Promise<Precedent | null> {
  const scopedQuery = opts.channelId ? `${query} in:<#${opts.channelId}>` : query;
  const res = (await client.apiCall("assistant.search.context", {
    query: scopedQuery,
    action_token: opts.actionToken,
    content_types: ["messages"],
    channel_types: ["public_channel"],
    limit: 8,
    sort: "score",
    include_context_messages: false,
  })) as any;

  // Verified live response fields: author_name, content, permalink, channel_name, message_ts,
  // is_author_bot. Skip empty-content hits (joins / file shares) and the triggering message.
  const messages = res?.results?.messages ?? (Array.isArray(res?.results) ? res.results : []);
  const valid = messages.filter(
    (m: any) =>
      typeof m?.content === "string" &&
      m.content.trim().length > 0 &&
      m.message_ts !== opts.excludeTs,
  );
  // Prefer Dispatch's own resolution ledger (bot-authored "Resolved: X did Y") over stray
  // user pleas, which name no handler. Fall back to the top valid hit if no ledger record.
  const hit = valid.find((m: any) => m.is_author_bot) ?? valid[0];
  if (!hit) return null;
  return {
    authorName: hit.author_name,
    content: hit.content,
    permalink: hit.permalink,
    channelName: hit.channel_name,
    ts: hit.message_ts,
    isAuthorBot: hit.is_author_bot,
  };
}

// ── T-09: Fallback over the seeded corpus (GATE insurance) ──
// Same return type as recallPrecedent → match.ts never knows which path ran.
interface SeedRow extends Precedent {
  embedding?: number[];
}

const corpus: SeedRow[] = JSON.parse(
  readFileSync(join(__dirname, "seed", "past-requests.json"), "utf8"),
);

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export async function recallPrecedentFallback(
  embed: (s: string) => Promise<number[]>,
  query: string,
  threshold = 0.5,
): Promise<Precedent | null> {
  const withEmb = corpus.filter((r) => Array.isArray(r.embedding));
  // No precomputed embeddings yet → zero-dependency keyword recall so the spike never blocks.
  if (withEmb.length === 0) return keywordRecall(query);

  const q = await embed(query);
  let best: { row: SeedRow; score: number } | null = null;
  for (const row of withEmb) {
    const score = cosine(q, row.embedding!);
    if (!best || score > best.score) best = { row, score };
  }
  return best && best.score >= threshold ? strip(best.row) : null;
}

// Last-resort lexical match — runs with no LLM/embeddings keys at all.
// Strips stopwords and weights matches by term length so specific terms (e.g. "dialysis")
// dominate filler words ("a", "to") that otherwise skew a tiny corpus toward the wrong thread.
const STOPWORDS = new Set(
  ("a an and the to of for in on at as is are was were be been being i we you he she it they them his " +
   "her their our your my me with without over under up off out so that this these those who whom when " +
   "where why how can could would should will just from during while about into than then there here not " +
   "no nobody someone anyone new need needs take takes get got had has have").split(/\s+/),
);

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function keywordRecall(query: string): Precedent | null {
  const q = new Set(tokenize(query));
  let best: { row: SeedRow; score: number } | null = null;
  for (const row of corpus) {
    const score = tokenize(row.content)
      .filter((w) => q.has(w))
      .reduce((sum, w) => sum + w.length, 0); // longer term = more specific signal
    if (!best || score > best.score) best = { row, score };
  }
  return best && best.score > 0 ? strip(best.row) : null;
}

function strip(r: SeedRow): Precedent {
  return {
    authorName: r.authorName,
    content: r.content,
    permalink: r.permalink,
    channelName: r.channelName,
    ts: r.ts,
  };
}
