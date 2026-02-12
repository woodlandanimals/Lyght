import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ swarmId: string }> }
) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  const { swarmId } = await params;

  const swarm = await prisma.swarm.findUnique({
    where: { id: swarmId },
    include: {
      issues: {
        include: { assignee: true, agentRuns: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
      agentRuns: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!swarm) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(swarm);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ swarmId: string }> }
) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  const { swarmId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowedFields = ["status", "strategy", "objective", "totalTasks", "completedTasks", "blockedTasks", "activeAgents"];
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const swarm = await prisma.swarm.update({
    where: { id: swarmId },
    data,
  });

  return NextResponse.json(swarm);
}
