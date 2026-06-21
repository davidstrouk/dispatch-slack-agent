import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Volunteer } from "./types.js";

// ── T-13/T-15: custom MCP server exposing the volunteer roster ──
// Satisfies the challenge's "MCP server integration" requirement: an external data
// source connected to the agent through the open MCP standard. Runs over stdio; the
// Bolt app spawns it as a child process (see mcp-client.ts).
const __dirname = dirname(fileURLToPath(import.meta.url));
const VOLUNTEERS: Volunteer[] = JSON.parse(
  readFileSync(join(__dirname, "seed", "roster.json"), "utf8"),
);

const server = new McpServer({ name: "dispatch-roster", version: "0.1.0" });

server.tool(
  "query_roster",
  "Find available volunteers for a need type, ranked by distance then availability.",
  { need_type: z.string(), max_distance_mi: z.number().optional() },
  async ({ need_type, max_distance_mi = 25 }) => {
    const matches = VOLUNTEERS.filter(
      (v) => v.available && v.skills.includes(need_type) && v.distanceMi <= max_distance_mi,
    ).sort((a, b) => a.distanceMi - b.distanceMi);
    return { content: [{ type: "text", text: JSON.stringify(matches) }] };
  },
);

await server.connect(new StdioServerTransport());
// stdout is the MCP transport — log to stderr only.
console.error("[dispatch-roster] MCP server ready on stdio");
