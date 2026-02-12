import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ initiativeId: string }> }
) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

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
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  const { initiativeId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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
