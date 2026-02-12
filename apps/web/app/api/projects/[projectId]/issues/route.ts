import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
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
