import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  // Get agent runs waiting for review
  const waitingRuns = await prisma.agentRun.findMany({
    where: {
      status: { in: ["waiting_review", "completed"] },
      ...(projectId ? { issue: { projectId } } : {}),
    },
    include: {
      issue: { select: { id: true, number: true, title: true, projectId: true, project: { select: { key: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get pending review items
  const reviewItems = await prisma.reviewItem.findMany({
    where: {
      status: "pending",
      ...(projectId ? { issue: { projectId } } : {}),
    },
    include: {
      issue: { select: { id: true, number: true, title: true, projectId: true, project: { select: { key: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ waitingRuns, reviewItems });
}
