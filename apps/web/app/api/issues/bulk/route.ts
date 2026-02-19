import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth";

// PATCH /api/issues/bulk — bulk update issues (assigneeId, status, etc.)
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  const body = await request.json();
  const { ids, ...updates } = body as { ids: string[]; [key: string]: unknown };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  const allowedFields = ["status", "priority", "assigneeId", "type"];
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) data[field] = updates[field];
  }

  await prisma.issue.updateMany({ where: { id: { in: ids } }, data });
  return NextResponse.json({ updated: ids.length });
}

// DELETE /api/issues/bulk — bulk delete issues
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  await prisma.issue.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ deleted: ids.length });
}
