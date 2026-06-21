import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Volunteer } from "./types.js";

// ── T-14: connect the Bolt agent to the roster MCP server ──
// Spawns roster-mcp-server.ts as a child process over stdio (no build step needed in dev).
export async function makeRosterClient(): Promise<Client> {
  const transport = new StdioClientTransport({
    command: process.execPath, // node
    args: ["--import", "tsx", "src/roster-mcp-server.ts"],
  });
  const client = new Client({ name: "dispatch-agent", version: "0.1.0" });
  await client.connect(transport);
  return client;
}

export async function queryRoster(client: Client, needType: string): Promise<Volunteer[]> {
  const res = (await client.callTool({
    name: "query_roster",
    arguments: { need_type: needType },
  })) as any;
  return JSON.parse(res.content[0].text);
}
