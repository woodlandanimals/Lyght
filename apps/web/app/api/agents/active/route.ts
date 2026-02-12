import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth";

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

  const activeRuns = await prisma.agentRun.findMany({
    where: {
      status: { in: ["running", "queued"] },
      ...(projectId ? { issue: { projectId } } : {}),
    },
    include: {
      issue: { select: { id: true, number: true, title: true, projectId: true, project: { select: { key: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(activeRuns);
}
