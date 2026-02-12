import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, handleAuthError } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    await requireProjectAccess(projectId);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const type = url.searchParams.get("type");

  const where: Record<string, unknown> = { projectId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (type) where.type = type;

  const issues = await prisma.issue.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { assignee: true },
  });

  return NextResponse.json(issues);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  let user;
  try {
    user = await requireProjectAccess(projectId);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, type, priority, tags, initiativeId } = body;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  // Get next issue number
  const lastIssue = await prisma.issue.findFirst({
    where: { projectId },
    orderBy: { number: "desc" },
  });
  const nextNumber = (lastIssue?.number || 0) + 1;

  const issue = await prisma.issue.create({
    data: {
      number: nextNumber,
      title,
      description: description || "",
      type: type || "task",
      priority: priority || "medium",
      tags: tags || null,
      projectId,
      createdById: user.id,
      initiativeId: initiativeId || null,
    },
  });

  return NextResponse.json(issue);
}
