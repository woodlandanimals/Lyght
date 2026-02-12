import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPreset } from "@/lib/mcp/presets";
import { requireAuth, handleAuthError } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";

// PATCH — update a connection
export async function PATCH(
  request: NextRequest,
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const connection = await prisma.mcpConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const allowedFields = ["url", "authToken", "enabled", "status"];
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      // Encrypt authToken before storing
      if (field === "authToken" && body[field]) {
        updateData[field] = encrypt(body[field]);
      } else {
        updateData[field] = body[field];
      }
    }
  }

  const updated = await prisma.mcpConnection.update({
    where: { id: connectionId },
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    connection: {
      ...updated,
      authToken: updated.authToken ? "••••••••" : null,
      preset: getPreset(updated.serverId),
    },
  });
}

// DELETE — remove a connection
export async function DELETE(
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

  await prisma.mcpConnection.delete({
    where: { id: connectionId },
  });

  return NextResponse.json({ success: true });
}
