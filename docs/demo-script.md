# Dispatch — demo video script (two surfaces, ~2:40)

For the Slack Agent Builder Challenge (For Good track). Climax = the **agent pane with live
"thinking,"** which is the strongest, most credible proof of the three required technologies.
Keep under 3:00.

## Narrative
Mutual-aid groups coordinate life-or-death help — dialysis rides, baby formula — in chaotic Slack
channels where one volunteer drowns and people fall through the cracks. Dispatch fixes that two ways
from one brain: it **auto-assigns** the right volunteer the moment a plea is posted in a channel, AND
it's a full Slack **agent** you can just ask — watch it think out loud, then assign the one person
who's done this exact thing before, recalled from the workspace's own history.

## Flow (time-coded)
| t (s) | On screen | Say (≤15 words) |
|---|---|---|
| 0–18 | Scroll chaotic #mutual-aid, pleas flying past | "This is a mutual-aid channel — real needs, scrolling past faster than anyone can triage." |
| 18–45 | Post a plea; with zero human input the **card** appears | "Someone needs a dialysis ride. Seconds later, Dispatch assigns Maria — and explains why." |
| 45–55 | Open the **Dispatch agent pane** — greeting + suggested prompts | "That runs automatically. But a coordinator can also just ask the agent." |
| **55–92** | **WOW:** type "Someone needs a ride to dialysis tomorrow morning" → send → **live thinking streams the real steps** → card. ONE UNCUT TAKE. | "I ask in plain English. Watch it think — live, no edits." [then SILENCE] |
| 92–108 | Zoom the card: **Assigned ▸ Maria R.** + 🧠 "Recalled from this workspace" link to the #mutual-aid record | "It recalled that Maria already drove this exact run — from the channel's own history." |
| 108–124 | Cut to architecture diagram; highlight boxes | "Three Slack technologies, one agent: Slack AI classified it; a custom MCP server held the roster." |
| 124–140 | Highlight RTS box → privacy note | "Real-Time Search recalled Maria — permission-aware, nothing leaves Slack. That's why I chose it." |
| 140–160 | Calm, organized channel → Dispatch title card | "Every agent waits to be asked. Dispatch reads the cry — and hands it to whoever's done it before." |

## Wow-moment staging (the agent pane, ~0:55–1:32)
- **Setup:** say "Watch it think — live, no edits," then STOP. Don't narrate over the stream.
- **Action:** let the animated status stream uncut — *Reading the request… → Need: transport · urgency
  high — finding volunteers… → Searching workspace history for who's helped before…* — then the card
  lands. Slow-zoom the streaming status, then the card's precedent line.
- **Pause:** ~3 seconds of silence while it thinks.
- **Audience sees:** a live, animated "thinking" indicator narrating the ACTUAL pipeline, then an
  assignment card naming Maria with a recalled precedent — one unbroken take, no fakes.
- **Reveal line:** "That wasn't scripted. It thought through the real steps — and recalled the right person."

## Differentiation (closing)
Unlike every other agent in this challenge — which waits for you to ask and then answers — Dispatch
works both **unprompted in the channel** and **on demand in its pane**, and either way it thinks out
loud and assigns the one volunteer who's already done this exact thing, recalled from the workspace's
own history via the **Real-Time Search API**.

## Rehearsal checklist
- `USE_FAKES=false` for the agent-pane segment — the live thinking→card must be real (top-prize lever).
- App running: `npx tsx src/app.ts` → "⚡️ Dispatch is listening"; `rtsClient` uses `SLACK_USER_TOKEN`.
- Messages Tab enabled (`app_home.messages_tab_read_only_enabled:false`) so the agent receives messages.
- `DISPATCH_CHANNEL_ID` set; #mutual-aid pre-seeded with the resolution history incl. the Maria/Chen/dialysis record.
- Refresh Slack (Cmd-R) so the agent appears; **New Chat** for a clean greeting + prompts.
- Slack on Do Not Disturb; OS + Slack notifications off; other workspaces hidden; legible zoom.
- Record type→think→card as ONE unbroken take; pre-warm with a throwaway request (the stream is fast).
- Architecture diagram (`docs/architecture.png`) ready for the ~1:48 cut.
- Run the full flow 3× clean; keep the best take; have a backup recording; confirm total < 3:00.
