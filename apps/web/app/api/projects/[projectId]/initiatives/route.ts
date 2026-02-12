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

  const where: Record<string, unknown> = { projectId };
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const initiatives = await prisma.initiative.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      lead: true,
      createdBy: true,
      issues: { select: { id: true, status: true } },
    },
  });

  // Add progress info
  const withProgress = initiatives.map((ini) => {
    const total = ini.issues.length;
    const done = ini.issues.filter((i) => i.status === "done" || i.status === "closed").length;
    return {
      ...ini,
      issueCount: total,
      doneCount: done,
    };
  });

  return NextResponse.json(withProgress);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, description, priority } = body;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  // Get next initiative number
  const lastInitiative = await prisma.initiative.findFirst({
    where: { projectId },
    orderBy: { number: "desc" },
  });
  const nextNumber = (lastInitiative?.number || 0) + 1;

  const initiative = await prisma.initiative.create({
    data: {
      number: nextNumber,
      title,
      description: description || "",
      priority: priority || "medium",
      projectId,
      createdById: user.id,
    },
  });

  return NextResponse.json(initiative);
}
