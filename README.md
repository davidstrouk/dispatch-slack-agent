# Dispatch

A mutual-aid coordination agent for Slack — built for the **Slack Agent Builder Challenge** (For Good track).

A free-text plea posted in a channel becomes, within seconds and with zero human input, a Block Kit
card that names **one** volunteer and justifies the pick with a reasoning line ending in a recalled
past request from the workspace's own history.

> "Assigned ▸ **Maria R.** — available tomorrow AM · 1.2 mi away · already handled this exact transport request before"

## The three required technologies, used together
- **Slack AI** — classifies the free-text request → `need_type` + `urgency` (`src/classify.ts`)
- **MCP server integration** — a custom MCP server exposes the volunteer roster as a `query_roster` tool (`src/roster-mcp-server.ts`)
- **Real-Time Search (RTS) API** — `assistant.search.context` recalls who handled similar past requests (`src/rts.ts`)

## Runs offline first
The whole pipeline runs **with zero API keys**: classification degrades to a heuristic and precedent
recall degrades to keyword search over the seeded corpus. Wire real keys as you go.

## Build order → file map
| Task | What | File |
|---|---|---|
| T-03 | Bolt skeleton + channel listener | `src/app.ts` |
| T-06 | Seeded workspace history (RTS corpus) | `src/seed/past-requests.json` |
| T-07/08/10 | **RTS precedent recall + GATE** | `src/rts.ts`, `src/spike-rts.ts` |
| T-09 | Embeddings fallback | `src/embed.ts` (+ fallback in `rts.ts`) |
| T-11/12 | Slack AI classification | `src/classify.ts` |
| T-13/15 | Custom MCP roster server | `src/roster-mcp-server.ts`, `src/seed/roster.json` |
| T-14 | Agent ↔ MCP client | `src/mcp-client.ts` |
| T-16/17 | Reasoned match (precedent biases the pick) | `src/match.ts` |
| T-18 | Block Kit assignment card | `src/card.ts` |
| T-19 | End-to-end wiring + `USE_FAKES` demo path | `src/app.ts`, `src/fakes.ts` |

## Setup
```bash
npm install
cp .env.example .env      # fill in Slack tokens when ready (optional for the spike)
```

### 1. Run the GATE first (no Slack needed)
Prove precedent recall works before building anything else:
```bash
npm run spike -- "ride to dialysis tomorrow 9am"
# → PRECEDENT: Maria R. ... ✅ GATE PASS
```
With a `SLACK_USER_TOKEN` (search:read.public) or bot token in `.env`, the spike hits the **real RTS
API**; without one it exercises the keyword fallback over the seeded corpus.

### 2. Run the roster MCP server standalone (optional sanity check)
```bash
npm run roster      # starts the stdio MCP server; Ctrl-C to stop
```

### 3. Boot the agent in Socket Mode
Fill `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`, `DISPATCH_CHANNEL_ID` in `.env`, then:
```bash
npm run dev
```
Post a help request in the channel → Dispatch replies with the assignment card.

### Demo recording
Set `USE_FAKES=true` for a deterministic precedent so the wow lands on the first take.

## Slack app setup
Create the app from `manifest.json` (scopes: `app_mentions:read`, `channels:history`, `chat:write`,
`search:read.public`; Socket Mode on; events `app_mention` + `message.channels`). Generate an
App-Level Token with `connections:write` for Socket Mode.

## Verify the two seams in your sandbox
1. **`action_token`** — bot-token RTS calls may require an `action_token` from the event payload. If
   awkward, use an `xoxp-` user token with `search:read.public`.
2. **RTS method/field names** — `assistant.search.context` is called via `apiCall` (untyped). Confirm
   the request params and response field names against the live RTS docs if results look off.
