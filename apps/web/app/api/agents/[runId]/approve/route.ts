import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  const agentRun = await prisma.agentRun.update({
    where: { id: runId },
    data: { status: "completed", completedAt: new Date() },
  });

  await prisma.issue.update({
    where: { id: agentRun.issueId },
    data: { status: "done" },
  });

  // Update review items
  await prisma.reviewItem.updateMany({
    where: { issueId: agentRun.issueId, status: "pending" },
    data: { status: "approved", resolvedAt: new Date() },
  });

  // Sync approval to planning chat thread
  await prisma.planningMessage.create({
    data: {
      issueId: agentRun.issueId,
      role: "system",
      type: "approval",
      content: "Agent output approved",
    },
  });

  return NextResponse.json({ success: true });
}
