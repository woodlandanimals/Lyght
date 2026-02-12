export interface AgentType {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  modelMatch: string[];
}

export const AGENT_REGISTRY: AgentType[] = [
  {
    id: "claude",
    name: "Claude",
    icon: "✦",
    description: "Anthropic Claude — General coding agent",
    color: "lyght-orange",
    modelMatch: ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-sonnet-4-20250514"],
  },
  {
    id: "rovo",
    name: "Rovo",
    icon: "⚡",
    description: "Atlassian Rovo — Knowledge & search agent",
    color: "lyght-blue",
    modelMatch: ["rovo"],
  },
  {
    id: "figma-mcp",
    name: "Figma MCP",
    icon: "◆",
    description: "Figma Model Context Protocol — Design agent",
    color: "lyght-yellow",
    modelMatch: ["figma-mcp"],
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    icon: "✶",
    description: "OpenClaw — Open source multi-agent",
    color: "lyght-green",
    modelMatch: ["openclaw"],
  },
];

export function getAgentType(model: string): AgentType {
  return (
    AGENT_REGISTRY.find((a) => a.modelMatch.includes(model)) ??
    AGENT_REGISTRY[0]
  );
}

export function getAgentTypeById(id: string): AgentType | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id);
}
