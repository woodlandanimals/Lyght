import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  const where = projectId ? { projectId } : {};

  const swarms = await prisma.swarm.findMany({
    where,
    include: {
      issues: { select: { id: true, title: true, status: true, number: true } },
      agentRuns: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(swarms);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, objective, projectId, issueIds } = body;

  if (!name || !objective || !projectId) {
    return NextResponse.json({ error: "name, objective, and projectId required" }, { status: 400 });
  }

  const swarm = await prisma.swarm.create({
    data: {
      name,
      objective,
      projectId,
      totalTasks: issueIds?.length || 0,
    },
  });

  // Assign issues to swarm
  if (issueIds && issueIds.length > 0) {
    await prisma.issue.updateMany({
      where: { id: { in: issueIds } },
      data: { swarmId: swarm.id },
    });
  }

  return NextResponse.json(swarm);
}
