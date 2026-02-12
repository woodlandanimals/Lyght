import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { discoverTools } from "@/lib/mcp/client";
import { requireAuth, handleAuthError } from "@/lib/auth";

// POST — test and refresh an existing connection
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; connectionId: string }> }
) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

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
