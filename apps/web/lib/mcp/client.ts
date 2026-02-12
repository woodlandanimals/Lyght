import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

/**
 * Dynamically import MCP SDK modules (ESM-only package).
 * Uses dynamic import to avoid Next.js server compilation issues.
 */
async function getMcpModules() {
  const [clientMod, httpMod, sseMod] = await Promise.all([
    import("@modelcontextprotocol/sdk/client/index.js"),
    import("@modelcontextprotocol/sdk/client/streamableHttp.js"),
    import("@modelcontextprotocol/sdk/client/sse.js"),
  ]);
  return {
    Client: clientMod.Client,
    StreamableHTTPClientTransport: httpMod.StreamableHTTPClientTransport,
    SSEClientTransport: sseMod.SSEClientTransport,
  };
}

export interface McpToolDef {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  connectionId: string;
  serverId: string;
}

interface ConnectionConfig {
  id: string;
  serverId: string;
  transport: string;
  url: string;
  authToken?: string | null;
}

/**
 * Safely decrypt an auth token. Returns null if decryption fails
 * (e.g., token was stored before encryption was enabled).
 */
function safeDecryptToken(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    return decrypt(token);
  } catch {
    // Token may be stored in plaintext (pre-encryption migration)
    // Return as-is for backward compatibility
    return token;
  }
}

/**
 * Create an MCP Client with the appropriate transport for the connection config.
 * Connections are SHORT-LIVED — create, use, close. No long-lived sockets.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createMcpClient(
  config: ConnectionConfig
): Promise<{ client: any; close: () => Promise<void> }> {
  const { Client, StreamableHTTPClientTransport, SSEClientTransport } =
    await getMcpModules();

  const client = new Client(
    { name: "lyght", version: "1.0.0" },
    { capabilities: {} }
  );

  const headers: Record<string, string> = {};
  if (config.authToken) {
    headers["Authorization"] = `Bearer ${config.authToken}`;
  }

  if (config.transport === "sse") {
    const transport = new SSEClientTransport(new URL(config.url), {
      requestInit: { headers },
    });
    await client.connect(transport);
    return {
      client,
      close: async () => {
        await client.close();
      },
    };
  }

  // Default: Streamable HTTP
  const transport = new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: { headers },
  });
  await client.connect(transport);
  return {
    client,
    close: async () => {
      await client.close();
    },
  };
}

/**
 * Connect to an MCP server, call listTools(), cache the result, update status.
 */
export async function discoverTools(
  connectionId: string
): Promise<{ success: boolean; tools: McpToolDef[]; error?: string }> {
  const connection = await prisma.mcpConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) return { success: false, tools: [], error: "Connection not found" };

  // Claude Tools is a virtual integration — no actual MCP server to connect to
  if (connection.serverId === "claude-tools") {
    await prisma.mcpConnection.update({
      where: { id: connectionId },
      data: { status: "connected", lastPingAt: new Date(), toolsJson: "[]" },
    });
    return { success: true, tools: [] };
  }

  if (!connection.url) {
    return { success: false, tools: [], error: "Server URL is required" };
  }

  try {
    const { client, close } = await createMcpClient({
      ...connection,
      authToken: safeDecryptToken(connection.authToken),
    });

    const result = await client.listTools();
    const tools: McpToolDef[] = (result.tools || []).map((t: { name: string; description?: string; inputSchema?: unknown }) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
      connectionId: connection.id,
      serverId: connection.serverId,
    }));

    await close();

    // Cache tools and update status
    await prisma.mcpConnection.update({
      where: { id: connectionId },
      data: {
        status: "connected",
        lastPingAt: new Date(),
        toolsJson: JSON.stringify(tools),
      },
    });

    return { success: true, tools };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.mcpConnection.update({
      where: { id: connectionId },
      data: { status: "error" },
    });
    return { success: false, tools: [], error: errorMsg };
  }
}

/**
 * Test an MCP connection by performing a handshake and listing tools.
 */
export async function testConnection(config: {
  url: string;
  transport: string;
  authToken?: string;
  serverId: string;
}): Promise<{ success: boolean; toolCount: number; tools: McpToolDef[]; error?: string }> {
  // Claude Tools doesn't need a connection test
  if (config.serverId === "claude-tools") {
    return { success: true, toolCount: 0, tools: [] };
  }

  if (!config.url) {
    return { success: false, toolCount: 0, tools: [], error: "Server URL is required" };
  }

  try {
    const { client, close } = await createMcpClient({
      id: "test",
      serverId: config.serverId,
      transport: config.transport,
      url: config.url,
      authToken: config.authToken,
    });

    const result = await client.listTools();
    const tools: McpToolDef[] = (result.tools || []).map((t: { name: string; description?: string; inputSchema?: unknown }) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
      connectionId: "test",
      serverId: config.serverId,
    }));

    await close();
    return { success: true, toolCount: tools.length, tools };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, toolCount: 0, tools: [], error: errorMsg };
  }
}

/**
 * Invoke a tool on an MCP server through its connection.
 */
export async function invokeTool(
  connectionId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result?: string; error?: string }> {
  const connection = await prisma.mcpConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) return { success: false, error: "Connection not found" };
  if (!connection.url) return { success: false, error: "No server URL" };

  try {
    const { client, close } = await createMcpClient({
      ...connection,
      authToken: safeDecryptToken(connection.authToken),
    });
    const result = await client.callTool({ name: toolName, arguments: args });
    await close();

    // Extract text content from the result
    const textContent = (result.content as Array<{ type: string; text?: string }>)
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    return { success: true, result: textContent || JSON.stringify(result.content) };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Get all tools available across all enabled MCP connections for a project.
 * Uses cached toolsJson from database — no live connections needed.
 */
export async function getProjectTools(projectId: string): Promise<McpToolDef[]> {
  const connections = await prisma.mcpConnection.findMany({
    where: {
      projectId,
      enabled: true,
      status: "connected",
      serverId: { not: "claude-tools" }, // Claude Tools is a meta-integration
    },
  });

  const allTools: McpToolDef[] = [];

  for (const conn of connections) {
    if (conn.toolsJson) {
      try {
        const tools = JSON.parse(conn.toolsJson) as McpToolDef[];
        allTools.push(
          ...tools.map((t) => ({
            ...t,
            connectionId: conn.id,
            serverId: conn.serverId,
          }))
        );
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return allTools;
}

/**
 * Check if a project has claude-tools enabled.
 */
export async function isClaudeToolsEnabled(projectId: string): Promise<boolean> {
  const connection = await prisma.mcpConnection.findFirst({
    where: {
      projectId,
      serverId: "claude-tools",
      enabled: true,
      status: "connected",
    },
  });
  return !!connection;
}
