import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  await prisma.agentRun.update({
    where: { id: runId },
    data: { acknowledgedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
