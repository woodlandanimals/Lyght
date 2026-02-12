import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireProjectAccess, handleAuthError } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

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
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, objective, projectId, issueIds } = body;

  if (!name || !objective || !projectId) {
    return NextResponse.json({ error: "name, objective, and projectId required" }, { status: 400 });
  }

  try {
    await requireProjectAccess(projectId);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
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
      where: { id: { in: issueIds }, projectId },
      data: { swarmId: swarm.id },
    });
  }

  return NextResponse.json(swarm);
}
