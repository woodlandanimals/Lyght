import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  const { issueId } = await params;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      project: true,
      assignee: true,
      createdBy: true,
      comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
      agentRuns: { orderBy: { createdAt: "desc" } },
      reviewItems: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(issue);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  const { issueId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowedFields = [
    "title", "description", "status", "priority", "type",
    "assigneeId", "tags", "aiPlan", "aiPrompt", "planStatus",
    "agentOutput", "swarmId",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const issue = await prisma.issue.update({
    where: { id: issueId },
    data,
  });

  // Auto-trigger planning when status changes to "planning"
  if (body.status === "planning") {
    // We just update the status, the user will trigger plan generation manually or it happens automatically
  }

  return NextResponse.json(issue);
}
