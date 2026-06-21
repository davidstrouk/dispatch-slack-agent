# Dispatch — Devpost submission

**Track:** Slack Agent for Good
**Tagline (≤280):** Dispatch turns a mutual-aid channel's chaos into action. Post "drive my mom to dialysis" and — with zero human input, in seconds — it assigns the one volunteer who's done it before, recalled from the channel's own history. Slack AI + MCP + Real-Time Search. 🧠

---

## Inspiration
Mutual-aid groups coordinate life-critical help — rides to dialysis, formula for a newborn, a prescription pickup — inside chaotic Slack and group channels. One volunteer coordinator drowns under overlapping pleas, and people fall through the cracks. The knowledge of *who can help* and *who's done this before* already lives in the channel's history. Nobody can act on it fast enough. Dispatch can.

## What it does
When someone posts a free-text plea, Dispatch — with **zero human input, in seconds** — :
1. **Classifies** the need and urgency (transport · HIGH).
2. **Finds** available volunteers from the roster.
3. **Recalls** who handled similar requests before, from the workspace's own history.
4. **Posts** a Block Kit card assigning **one** volunteer, with a reason that ends in the recalled precedent:

> **Assigned ▸ Maria R.** — available tomorrow AM · 1.2 mi away · *already handled this exact dialysis run for the Chen family*
> 🧠 *Recalled from this workspace* → [original thread]

The recalled precedent **biases which volunteer is picked**, not just the wording — so it reads as judgment, not a filter. A **fairness guard** rotates away from volunteers carrying recent load, so reliable helpers don't burn out.

## How I built it
A **Bolt** app (TypeScript, Socket Mode) orchestrates one event handler that uses **all three** required Slack technologies together:
- **Slack AI** classifies the free-text plea → `need_type` + `urgency`.
- A **custom MCP server** exposes the volunteer roster as a `query_roster` tool the agent calls over the open MCP standard.
- The **Real-Time Search API** (`assistant.search.context`) recalls similar past requests from the channel's history.

A reasoned-match layer fuses the three and lets the precedent bias the pick. The whole pipeline runs **offline with graceful fallbacks** (heuristic classification, stopword-weighted keyword / embeddings recall), so it's testable end-to-end without any keys.

**Privacy by design:** I deliberately used RTS instead of scraping messages into my own database. RTS is **permission-aware and nothing leaves Slack** — the right posture when you're handling vulnerable people's needs, and a moat a generic external bot can't cross.

## Challenges I ran into
- The RTS API is brand new — pinning down the `action_token` requirement and response shape. I isolated it behind an adapter with a fallback so the demo never hard-fails.
- Making the match feel like *judgment, not a filter* — solved by letting workspace history bias the choice, not just decorate the card.
- Keeping recall credible on a small corpus — stopword-weighted scoring so specific terms like "dialysis" dominate filler words.

## Accomplishments I'm proud of
All three required technologies working together in one coherent, diagrammed flow — producing a precedent-grounded assignment that **no external LLM could generate, because the data never leaves Slack.** Verified end-to-end before a single key was wired.

## What I learned
The unique value of an in-Slack agent isn't the model — it's the workspace's own history (RTS) and permission model. That's the real moat.

## What's next
- One-click roster onboarding (form / sheet) so non-technical mutual-aid orgs can adopt it.
- Multi-request throughput, reassignment flows, and a live status board.
- A **Slack Marketplace** listing.

## Built with
`typescript` · `slack` · `bolt` · `slack-ai` · `model-context-protocol` · `mcp` · `real-time-search-api` · `block-kit` · `socket-mode` · `node.js`

## Links
- **Demo video:** _[TBD — record after build]_
- **Architecture diagram:** `docs/architecture.png`
- **Repo:** _[TBD — push to public GitHub]_
- **Judge sandbox access:** _[TBD — provision sandbox, add judges' emails]_
