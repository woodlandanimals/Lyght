import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function POST(
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
    include: { issues: true },
  });

  if (!swarm) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update swarm status
  await prisma.swarm.update({
    where: { id: swarmId },
    data: { status: "active" },
  });

  // Start execution for ready issues with approved plans
  const readyIssues = swarm.issues.filter(
    (i) => i.planStatus === "approved" && (i.status === "ready" || i.status === "planned")
  );

  const results = [];
  for (const issue of readyIssues) {
    try {
      const res = await fetch(new URL("/api/ai/execute-task", request.url).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": request.headers.get("cookie") || "",
        },
        body: JSON.stringify({ issueId: issue.id }),
      });
      const data = await res.json();
      results.push({ issueId: issue.id, ...data });
    } catch (error) {
      results.push({ issueId: issue.id, error: String(error) });
    }
  }

  await prisma.swarm.update({
    where: { id: swarmId },
    data: { activeAgents: readyIssues.length },
  });

  return NextResponse.json({ started: results.length, results });
}
