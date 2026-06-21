# Dispatch — architecture

A community member posts a free-text plea in a Slack channel. With **zero human input**, a Bolt
agent classifies it, finds candidate volunteers, recalls who handled similar requests before, and
posts a Block Kit assignment card back to the channel — in seconds.

The agent uses **all three** required Slack technologies in a single event handler.

```mermaid
flowchart TB
    U(["Community member"]) -->|"free-text plea<br/>'drive my mom to dialysis'"| CH["#mutual-aid channel"]
    CH -->|"message.channels event"| BOLT["Bolt app · Socket Mode<br/>app.ts (orchestrator)"]

    subgraph AGENT["Dispatch agent — one event handler"]
      direction TB
      C["① Slack AI classify<br/>need_type + urgency<br/>classify.ts"]
      M["② Custom MCP server<br/>query_roster tool<br/>roster-mcp-server.ts"]
      R["③ Real-Time Search API<br/>assistant.search.context<br/>precedent recall · rts.ts"]
      MATCH["Reasoned match<br/>precedent biases the pick<br/>match.ts"]
      C --> MATCH
      M --> MATCH
      R --> MATCH
    end

    BOLT --> C
    BOLT --> M
    BOLT --> R

    ROSTER[("Volunteer roster<br/>roster.json")] -.-> M
    HIST[("Workspace history<br/>past requests")] -.->|"searched by RTS"| R
    R -. "fallback" .-> EMB["embeddings / keyword<br/>over seeded corpus"]

    MATCH --> CARD["Block Kit assignment card<br/>card.ts"]
    CARD -->|"posted in seconds · 0 human input"| CH
    CARD -->|"Accept"| ONIT["✅ On it + status board"]

    classDef tech fill:#1f6feb,color:#fff,stroke:#0b3d91,stroke-width:2px;
    class C,M,R tech;
```

## The three required technologies
| # | Technology | Role in Dispatch | Source |
|---|---|---|---|
| ① | **Slack AI** | Classifies the free-text plea → `need_type` + `urgency` | `src/classify.ts` |
| ② | **MCP server integration** | Custom MCP server exposes the volunteer roster as a `query_roster` tool the agent calls | `src/roster-mcp-server.ts`, `src/mcp-client.ts` |
| ③ | **Real-Time Search API** | `assistant.search.context` recalls who handled similar past requests from workspace history | `src/rts.ts` |

The **reasoned match** (`src/match.ts`) is the key: the RTS-recalled precedent *biases which volunteer
is chosen*, not just what the card says — so the agent shows judgment grounded in the workspace's own history.
