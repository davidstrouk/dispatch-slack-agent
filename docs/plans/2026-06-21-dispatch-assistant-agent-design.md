# Design: Dispatch as a Slack Assistant (agent with thinking)

**Date:** 2026-06-21
**Status:** Approved
**Related tasks:** #10 (clarify), #11 (design), #12 (doc + handoff)

## Goal
Turn Dispatch into a proper Slack **Assistant/Agent** — a dedicated AI pane with an animated
"thinking…" status, suggested prompts, and an agent thread — **in addition to** the existing
channel auto-dispatch flow (the protected demo wow), which stays unchanged.

## Approach decision: what "thinking" shows
**Chosen: real reasoning steps.** `setStatus` is called sequentially so the indicator narrates
Dispatch's *actual* pipeline (classify → find volunteers → search history → match), not generic
loading messages. The thinking is true, which reinforces the "is it real?" credibility the judge
simulation flagged.

## Architecture
The Bolt app gains `new Assistant({ threadStarted, userMessage })`. The existing `app.message`
channel handler (the protected wow) is **untouched**. Both surfaces call **one shared core**
extracted from today's handler.

## Components
1. **`dispatchRequest(text, { channelId, excludeTs })` → `{ need, candidates, precedent, match, ping }`**
   Extracted from the current channel handler (classify → MCP roster → RTS recall → buildMatch +
   escalationPing). Pure orchestration, unit-testable. Both surfaces reuse it; the channel handler
   keeps behaving exactly as it does now.
2. **`threadStarted`** — greet ("Hi — tell me who needs help") + `setSuggestedPrompts`
   (e.g. "Find a volunteer for a dialysis ride tomorrow", "Who can pick up groceries this week?").
3. **`userMessage`** — `setTitle(text)`, sequential `setStatus` updates around each real step,
   then `say(assignmentCard(...))` (status auto-clears when the card posts). RTS recall is scoped to
   **#mutual-aid** (`DISPATCH_CHANNEL_ID`) — the community history — since the pane is the control
   surface, not the data source.

## Data flow (the agent pane)
```
open pane → assistant_thread_started → greet + suggested prompts
user: "someone needs a ride to dialysis tomorrow"
  → setStatus "Reading the request…"
  → classify → setStatus "Need: transport · high — finding volunteers…"
  → MCP roster → setStatus "Searching workspace history for who's helped before…"
  → RTS recall (scoped to #mutual-aid) → buildMatch
  → say(assignment card: Maria R. + 🧠 recalled precedent)   [status clears]
```

## Config (requires one reinstall)
`manifest.json` gains: enable **Agents & AI Apps (Assistant)**; bot scope **`assistant:write`**;
events **`assistant_thread_started`**, **`assistant_thread_context_changed`**, **`message.im`**;
scope **`im:history`**. Reinstall the app to apply.

## Error handling
- No candidates → the agent states it plainly; no fabricated assignment.
- RTS failure → existing graceful fallback chain (live RTS → embeddings/keyword).
- Empty/non-text user message → ignored (Assistant subtype checks).

## Testing
TDD the extracted `dispatchRequest` core (need + match + ping correctness) — this also pins that the
channel wow is unchanged. The Assistant glue (`setStatus`/`say`) is Slack I/O, verified live in the
pane (as we did for the channel). No mocking of Slack internals.

## Non-goals
- Not converting to assistant-only; the channel auto-dispatch wow remains.
- No LLM-streamed free-form chat; the agent's job is request → reasoned assignment.
