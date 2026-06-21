# Dispatch Assistant Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Add a Slack Assistant pane to Dispatch with an animated "thinking…" status that mirrors the real pipeline, reusing the verified channel pipeline via one shared core.

**Architecture:** Extract the channel handler's orchestration into a testable `dispatchRequest(deps, text, ctx)` core. Add `new Assistant({ threadStarted, userMessage })` that calls the same core, emitting sequential `setStatus` updates, then posting the existing assignment card. The channel `app.message` handler is refactored to call the same core — behavior unchanged.

**Tech Stack:** TypeScript, @slack/bolt `Assistant`, @slack/web-api, @modelcontextprotocol/sdk, node:test.

**Design:** `docs/plans/2026-06-21-dispatch-assistant-agent-design.md`

---

### Task 0: Extract `dispatchRequest` core (TDD)

**Files:**
- Create: `dispatch/src/dispatch.ts`
- Create: `dispatch/src/dispatch.test.ts`
- Modify: `dispatch/src/app.ts` (channel handler reuses the core)

**Step 1: Write the failing test** — `dispatch/src/dispatch.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatchRequest } from "./dispatch.js";
import type { NeedClassification, Precedent, Volunteer } from "./types.js";

const maria: Volunteer = { name: "Maria R.", available: true, availabilityWindow: "tomorrow AM", skills: ["transport"], distanceMi: 1.2, pastHandled: [] };
const precedent: Precedent = { authorName: "dispatch", content: "Maria R. drove the Chen family to dialysis", permalink: "p", channelName: "mutual-aid", ts: "1", isAuthorBot: true };

const deps = {
  classify: async (): Promise<NeedClassification> => ({ need_type: "transport", urgency: "high", summary: "ride" }),
  queryRoster: async () => [maria],
  recallPrecedent: async () => precedent,
};

test("dispatchRequest assembles need, match (precedent-linked), and escalation ping", async () => {
  const r = await dispatchRequest(deps, "drive my mom to dialysis", { channelId: "C1", excludeTs: "9" });
  assert.equal(r.need.need_type, "transport");
  assert.equal(r.match?.volunteer.name, "Maria R.");
  assert.match(r.match!.reason, /already handled this exact transport request before/);
  assert.match(r.ping ?? "", /@here/);
});

test("dispatchRequest passes channel scope + excludeTs through to recall", async () => {
  let seen: any = null;
  await dispatchRequest({ ...deps, recallPrecedent: async (_t, ctx) => { seen = ctx; return null; } }, "x", { channelId: "C9", excludeTs: "5" });
  assert.deepEqual(seen, { channelId: "C9", excludeTs: "5" });
});
```

**Step 2: Run test to verify it fails**

Run: `cd dispatch && npm test`
Expected: FAIL — `Cannot find module './dispatch.js'`.

**Step 3: Write minimal implementation** — `dispatch/src/dispatch.ts`

```ts
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
```

**Step 4: Run test to verify it passes**

Run: `cd dispatch && npm test`
Expected: PASS — both new tests green, all prior tests still green, `npm run build` exit 0.

**Step 5: Refactor `app.ts` channel handler to use the core** (`dispatch/src/app.ts`)

Replace the body between `const need = await classify(...)` and `const match = buildMatch(...)` with:

```ts
const { need, match, ping } = await dispatchRequest(
  {
    classify,
    queryRoster: (nt) => queryRoster(roster, nt),
    recallPrecedent: (text, ctx) => getPrecedent(client, text, ctx),
  },
  m.text,
  { channelId: m.channel, excludeTs: m.ts, actionToken: m.action_token },
);
```

Keep the existing `if (!match) { say("No available volunteer…"); return; }`, the `if (ping) await say(ping);`, and `await say(assignmentCard(need, match));`. Remove the now-unused inline `precedentP`/`candidates` locals and direct `buildMatch`/`escalationPing` imports if no longer referenced.

**Step 6: Run build + smoke to confirm channel behavior unchanged**

Run: `cd dispatch && npm run build && npm run smoke -- "drive my mom to dialysis tomorrow 9am"`
Expected: build exit 0; smoke CARD TEXT still names Maria R.

**Step 7: Commit**

```bash
git add dispatch/src/dispatch.ts dispatch/src/dispatch.test.ts dispatch/src/app.ts
git commit -m "refactor(dispatch): extract shared dispatchRequest core"
```

---

### Task 1: Add the Assistant module (thinking status) + wire it in

**Files:**
- Create: `dispatch/src/assistant.ts`
- Modify: `dispatch/src/app.ts` (construct deps once, `app.assistant(...)`)

**Step 1: Write `dispatch/src/assistant.ts`**

```ts
import boltPkg from "@slack/bolt";
import { assignmentCard } from "./card.js";
import { dispatchRequest, type DispatchDeps } from "./dispatch.js";

const { Assistant } = boltPkg;

// `recallChannelId` is the community channel (#mutual-aid) whose history we recall from —
// the pane is the control surface, not the data source.
export function makeAssistant(deps: DispatchDeps, recallChannelId?: string) {
  return new Assistant({
    threadStarted: async ({ say, setSuggestedPrompts, saveThreadContext }) => {
      await say("Hi — tell me who needs help and I'll find the right volunteer.");
      await saveThreadContext();
      await setSuggestedPrompts({
        title: "Try one of these:",
        prompts: [
          { title: "Dialysis ride", message: "Someone needs a ride to dialysis tomorrow morning." },
          { title: "Groceries", message: "A family needs groceries dropped off this week." },
        ],
      });
    },
    userMessage: async ({ message, say, setTitle, setStatus }) => {
      const m = message as any;
      if (!m.text || !m.thread_ts) return;
      await setTitle(m.text);
      await setStatus({ status: "Reading the request…" });
      const result = await dispatchRequest(deps, m.text, { channelId: recallChannelId });
      await setStatus({ status: `Need: ${result.need.need_type} · urgency ${result.need.urgency} — finding volunteers…` });
      // candidates already fetched inside dispatchRequest; this status reflects the real step it ran
      await setStatus({ status: "Searching workspace history for who's helped before…" });
      if (!result.match) {
        await say(`I couldn't find an available volunteer for *${result.need.need_type}* right now.`);
        return;
      }
      await say(assignmentCard(result.need, result.match)); // status auto-clears when the card posts
    },
  });
}
```

**Step 2: Wire into `dispatch/src/app.ts`**

After `const roster = await makeRosterClient();` and the `rtsClient`/`getPrecedent` definitions, add:

```ts
import { makeAssistant } from "./assistant.js";
// …
const deps = {
  classify,
  queryRoster: (nt: string) => queryRoster(roster, nt),
  recallPrecedent: (text: string, ctx: any) => getPrecedent(client as any, text, ctx),
};
app.assistant(makeAssistant(deps, process.env.DISPATCH_CHANNEL_ID));
```

(Reuse `deps` in the channel handler too, replacing the inline object from Task 0 Step 5 — DRY.)

**Step 3: Build**

Run: `cd dispatch && npm run build`
Expected: exit 0. (`getPrecedent` uses the Bolt client for the action_token path; the Assistant passes no client, so recall uses the user-token `rtsClient` — confirm `getPrecedent` tolerates a possibly-undefined client when `rtsClient` is set.)

**Step 4: Commit**

```bash
git add dispatch/src/assistant.ts dispatch/src/app.ts
git commit -m "feat(dispatch): Slack Assistant pane with live thinking status"
```

---

### Task 2: Update the app manifest for the Assistant

**Files:**
- Modify: `dispatch/manifest.json`

**Step 1: Add assistant feature, scopes, and events**

- `features`: add `"assistant_view": { "assistant_description": "Find the right volunteer for any community need." }`
- `oauth_config.scopes.bot`: add `"assistant:write"`, `"im:history"`
- `settings.event_subscriptions.bot_events`: add `"assistant_thread_started"`, `"assistant_thread_context_changed"`, `"message.im"`

**Step 2: Commit**

```bash
git add dispatch/manifest.json
git commit -m "chore(dispatch): manifest — enable Assistant (Agents & AI Apps)"
```

**Step 3 (USER ACTION): apply config**

In the app config: enable **Agents & AI Apps**, then **Reinstall to Workspace** to grant `assistant:write` / `im:history` and subscribe to the new events. (Or recreate from the updated manifest.)

---

### Task 3: Live verification in the agent pane

**Step 1:** Restart the app: `cd dispatch && pkill -f "tsx src/app.ts"; npx tsx src/app.ts &`
**Step 2:** In Slack, open the **Dispatch** agent (sidebar → Apps → Dispatch, or the assistant pane).
**Step 3:** Confirm the greeting + suggested prompts appear (`threadStarted`).
**Step 4:** Send: "Someone needs a ride to dialysis tomorrow morning."
**Step 5:** Verify the **thinking status** cycles through the real steps, then the **assignment card** posts naming Maria R. with the 🧠 recalled precedent.
**Step 6:** Confirm the **channel** flow still works unchanged (post a plea in #mutual-aid → card).

**Acceptance:** agent pane shows live thinking + correct card; channel wow unchanged; all `npm test` green; `npm run build` exit 0.
