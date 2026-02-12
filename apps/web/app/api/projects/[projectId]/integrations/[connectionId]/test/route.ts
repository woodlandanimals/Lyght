import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { discoverTools } from "@/lib/mcp/client";

// POST — test and refresh an existing connection
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; connectionId: string }> }
) {
  const { connectionId } = await params;

  const connection = await prisma.mcpConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const result = await discoverTools(connectionId);

  return NextResponse.json(result);
}
