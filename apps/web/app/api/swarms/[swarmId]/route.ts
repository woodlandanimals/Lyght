import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ swarmId: string }> }
) {
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
  const { swarmId } = await params;
  const body = await request.json();

  const swarm = await prisma.swarm.update({
    where: { id: swarmId },
    data: body,
  });

  return NextResponse.json(swarm);
}
