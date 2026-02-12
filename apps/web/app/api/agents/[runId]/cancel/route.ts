import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  const { runId } = await params;

  await prisma.agentRun.update({
    where: { id: runId },
    data: { status: "cancelled", completedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
