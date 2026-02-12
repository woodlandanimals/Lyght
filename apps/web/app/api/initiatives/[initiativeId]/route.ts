import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ initiativeId: string }> }
) {
  const { initiativeId } = await params;

  const initiative = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    include: {
      project: true,
      lead: true,
      createdBy: true,
      issues: {
        include: { assignee: true },
        orderBy: { createdAt: "desc" },
      },
      planningMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!initiative) {
    return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
  }

  return NextResponse.json(initiative);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ initiativeId: string }> }
) {
  const { initiativeId } = await params;
  const body = await request.json();

  const allowedFields = [
    "title", "description", "status", "priority", "leadId",
    "aiPlan", "aiPrompt", "aiContext", "planStatus",
    "startDate", "targetDate",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if ((field === "startDate" || field === "targetDate") && body[field]) {
        data[field] = new Date(body[field]);
      } else {
        data[field] = body[field];
      }
    }
  }

  const initiative = await prisma.initiative.update({
    where: { id: initiativeId },
    data,
  });

  return NextResponse.json(initiative);
}
