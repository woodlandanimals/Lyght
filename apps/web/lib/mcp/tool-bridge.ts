import type { McpToolDef } from "./client";
import { invokeTool } from "./client";

/**
 * Anthropic tool definition format for the Claude API
 */
export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Record of a tool call made during execution
 */
export interface ToolCallRecord {
  toolName: string;
  serverId: string;
  connectionId: string;
  args: Record<string, unknown>;
  result: string;
  timestamp: string;
}

/**
 * Convert MCP tools to Anthropic tool format for Claude API calls.
 * Prefixes tool names with serverId to avoid naming collisions
 * (e.g., "figma__get_file", "slack__search_messages").
 */
export function mcpToolsToAnthropicTools(mcpTools: McpToolDef[]): AnthropicToolDef[] {
  return mcpTools.map((tool) => {
    const schema = tool.inputSchema || {};
    return {
      name: `${tool.serverId}__${tool.name}`,
      description: `[${tool.serverId}] ${tool.description || tool.name}`,
      input_schema: {
        type: "object" as const,
        properties: (schema.properties as Record<string, unknown>) || {},
        required: (schema.required as string[]) || [],
      },
    };
  });
}

/**
 * Parse a prefixed tool name back to serverId + original tool name.
 * e.g., "figma__get_file" → { serverId: "figma", toolName: "get_file" }
 */
function parseToolName(prefixedName: string): { serverId: string; toolName: string } | null {
  const separatorIndex = prefixedName.indexOf("__");
  if (separatorIndex === -1) return null;
  return {
    serverId: prefixedName.substring(0, separatorIndex),
    toolName: prefixedName.substring(separatorIndex + 2),
  };
}

/**
 * Create a tool handler function that routes tool calls to the correct MCP connection.
 * Returns the handler function and a record of all tool calls made.
 */
export function createToolHandler(mcpTools: McpToolDef[]): {
  handler: (name: string, args: Record<string, unknown>) => Promise<string>;
  getToolCalls: () => ToolCallRecord[];
} {
  const toolCalls: ToolCallRecord[] = [];

  // Build a lookup map: "serverId__toolName" → McpToolDef
  const toolMap = new Map<string, McpToolDef>();
  for (const tool of mcpTools) {
    toolMap.set(`${tool.serverId}__${tool.name}`, tool);
  }

  const handler = async (
    name: string,
    args: Record<string, unknown>
  ): Promise<string> => {
    const parsed = parseToolName(name);
    if (!parsed) {
      return JSON.stringify({ error: `Unknown tool format: ${name}` });
    }

    const tool = toolMap.get(name);
    if (!tool) {
      return JSON.stringify({ error: `Tool not found: ${name}` });
    }

    const result = await invokeTool(tool.connectionId, parsed.toolName, args);

    toolCalls.push({
      toolName: parsed.toolName,
      serverId: parsed.serverId,
      connectionId: tool.connectionId,
      args,
      result: result.success ? (result.result || "") : (result.error || "Tool invocation failed"),
      timestamp: new Date().toISOString(),
    });

    if (!result.success) {
      return JSON.stringify({ error: result.error || "Tool invocation failed" });
    }

    return result.result || "";
  };

  return { handler, getToolCalls: () => toolCalls };
}
