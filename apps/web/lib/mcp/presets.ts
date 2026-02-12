export interface McpPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  category: "design" | "communication" | "ai" | "code" | "backend" | "analytics";

  defaultUrl: string;
  defaultTransport: "http" | "sse" | "stdio";
  authType: "token" | "oauth" | "none";
  authLabel?: string;
  authPlaceholder?: string;

  docsUrl: string;
  setupInstructions: string;
}

export const MCP_PRESETS: McpPreset[] = [
  {
    id: "figma",
    name: "Figma",
    icon: "◆",
    description: "Extract designs, components, and generate code from Figma frames",
    color: "#A259FF",
    category: "design",
    defaultUrl: "https://mcp.figma.com/mcp",
    defaultTransport: "http",
    authType: "token",
    authLabel: "Figma Access Token",
    authPlaceholder: "figd_...",
    docsUrl: "https://developers.figma.com/docs/figma-mcp-server/",
    setupInstructions:
      "Generate a personal access token at figma.com/settings → Security → Personal Access Tokens",
  },
  {
    id: "slack",
    name: "Slack",
    icon: "⊞",
    description: "Search conversations, post updates, and fetch channel history",
    color: "#4A154B",
    category: "communication",
    defaultUrl: "",
    defaultTransport: "http",
    authType: "token",
    authLabel: "Slack Bot Token",
    authPlaceholder: "xoxb-...",
    docsUrl: "https://github.com/korotovsky/slack-mcp-server",
    setupInstructions:
      "Deploy korotovsky/slack-mcp-server and create a Slack App with Bot Token Scopes: channels:history, channels:read, chat:write, users:read",
  },
  {
    id: "claude-tools",
    name: "Claude Tools",
    icon: "✦",
    description:
      "Enhanced Claude with tool-use — agents can call connected MCP tools during execution",
    color: "#FF6B00",
    category: "ai",
    defaultUrl: "",
    defaultTransport: "http",
    authType: "none",
    docsUrl: "https://docs.anthropic.com/en/docs/build-with-claude/tool-use",
    setupInstructions:
      "Enables Claude agents to use tools from other connected MCP servers during planning and execution. No additional setup required.",
  },
];

export function getPreset(serverId: string): McpPreset | undefined {
  return MCP_PRESETS.find((p) => p.id === serverId);
}
