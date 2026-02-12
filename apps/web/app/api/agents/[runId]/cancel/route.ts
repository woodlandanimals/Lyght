import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  await prisma.agentRun.update({
    where: { id: runId },
    data: { status: "cancelled", completedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
