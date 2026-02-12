import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MCP_PRESETS, getPreset } from "@/lib/mcp/presets";
import { discoverTools } from "@/lib/mcp/client";

// GET — list all connections + available presets for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const connections = await prisma.mcpConnection.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  // Merge connection data with preset metadata
  const connected = connections.map((conn) => {
    const preset = getPreset(conn.serverId);
    let toolCount = 0;
    if (conn.toolsJson) {
      try {
        toolCount = JSON.parse(conn.toolsJson).length;
      } catch {
        // ignore
      }
    }
    return {
      ...conn,
      authToken: conn.authToken ? "••••••••" : null, // Never expose tokens
      preset,
      toolCount,
    };
  });

  // Find presets that aren't connected yet
  const connectedServerIds = new Set(connections.map((c) => c.serverId));
  const available = MCP_PRESETS.filter((p) => !connectedServerIds.has(p.id));

  return NextResponse.json({ connected, available });
}

// POST — create a new MCP connection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await request.json();
  const { serverId, url, authToken } = body;

  if (!serverId) {
    return NextResponse.json({ error: "serverId required" }, { status: 400 });
  }

  const preset = getPreset(serverId);
  if (!preset) {
    return NextResponse.json({ error: "Unknown integration" }, { status: 400 });
  }

  // Check if already connected
  const existing = await prisma.mcpConnection.findUnique({
    where: { projectId_serverId: { projectId, serverId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Integration already connected" }, { status: 409 });
  }

  // Create connection
  const connection = await prisma.mcpConnection.create({
    data: {
      projectId,
      name: preset.name,
      serverId: preset.id,
      transport: preset.defaultTransport,
      url: url || preset.defaultUrl,
      authType: preset.authType,
      authToken: authToken || null,
      status: "disconnected",
      enabled: true,
    },
  });

  // Attempt to discover tools (connects and caches)
  const discovery = await discoverTools(connection.id);

  // Reload the connection to get the updated status
  const updated = await prisma.mcpConnection.findUnique({
    where: { id: connection.id },
  });

  return NextResponse.json({
    success: true,
    connection: {
      ...updated,
      authToken: updated?.authToken ? "••••••••" : null,
      preset,
      toolCount: discovery.tools.length,
    },
    discovery,
  });
}
