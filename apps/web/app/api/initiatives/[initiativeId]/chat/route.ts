import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth, handleAuthError } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InitiativeWithProject = any;

// Stale generation timeout — if "generating" for more than 2 minutes, auto-reset
const STALE_GENERATION_MS = 2 * 60 * 1000;

/**
 * Invoke the Netlify background function for long-running AI work.
 * Background functions return 202 immediately and run for up to 15 minutes.
 */
async function invokeBackgroundFunction(payload: Record<string, unknown>, request: NextRequest) {
  // Use process.env.URL (set by Netlify) — request.nextUrl.origin returns internal Lambda URL
  const origin = process.env.URL || `https://${request.headers.get("host")}`;
  const bgUrl = `${origin}/.netlify/functions/generate-plan-background`;

  console.log(`[initiative-chat] Invoking background function: ${bgUrl}`);

  try {
    // Must await — unawaited fetches get killed when the Lambda shuts down.
    // Background functions return 202 instantly so this adds <100ms.
    const res = await fetch(bgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`[initiative-chat] Background function responded: ${res.status}`);
  } catch (err) {
    console.error("[initiative-chat] Failed to invoke background function:", err);
  }
}

// GET — return all planning messages for an initiative
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
    select: {
      id: true,
      aiPlan: true,
      planStatus: true,
      status: true,
      updatedAt: true,
    },
  });

  if (!initiative) {
    return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
  }

  // Stale generation recovery: if stuck in "generating" for too long, reset
  if (initiative.planStatus === "generating") {
    const elapsed = Date.now() - new Date(initiative.updatedAt).getTime();
    if (elapsed > STALE_GENERATION_MS) {
      await prisma.initiative.update({
        where: { id: initiativeId },
        data: { planStatus: "none" },
      });

      await prisma.planningMessage.create({
        data: {
          initiativeId,
          role: "system",
          type: "error",
          content: "Spec generation timed out. Please try again.",
        },
      });

      initiative.planStatus = "none";
    }
  }

  const messages = await prisma.planningMessage.findMany({
    where: { initiativeId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    messages,
    planStatus: initiative.planStatus,
    entityStatus: initiative.status,
  });
}

// POST — handle all planning interactions
export async function POST(
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

  const { message, action = "comment" } = body;

  const initiative = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    include: {
      project: true,
      issues: { select: { id: true, status: true } },
    },
  });

  if (!initiative) {
    return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
  }

  switch (action) {
    case "generate_plan":
      return handleGeneratePlan(initiative, request);

    case "revise_plan":
      return handleRevisePlan(initiative, message, request);

    case "approve_plan":
      return handleApprovePlan(initiative);

    case "create_issues":
      return handleCreateIssues(initiative);

    case "comment":
    default:
      return handleComment(initiative, message);
  }
}

// --- Action Handlers ---

async function handleGeneratePlan(initiative: InitiativeWithProject, request: NextRequest) {
  // Create "generating" system message
  await prisma.planningMessage.create({
    data: {
      initiativeId: initiative.id,
      role: "system",
      type: "status_change",
      content: "Generating spec...",
    },
  });

  await prisma.initiative.update({
    where: { id: initiative.id },
    data: { planStatus: "generating" },
  });

  // Invoke Netlify background function (runs up to 15 min)
  await invokeBackgroundFunction({
    entityType: "initiative",
    entityId: initiative.id,
    action: "generate_plan",
    title: initiative.title,
    description: initiative.description,
    projectName: initiative.project.name,
    repoUrl: initiative.project.repoUrl,
  }, request);

  return NextResponse.json({
    success: true,
    planStatus: "generating",
  });
}

async function handleRevisePlan(initiative: InitiativeWithProject, feedback: string, request: NextRequest) {
  if (!feedback?.trim()) {
    return NextResponse.json({ error: "Feedback required" }, { status: 400 });
  }

  // Save user feedback as a message
  await prisma.planningMessage.create({
    data: {
      initiativeId: initiative.id,
      role: "user",
      type: "text",
      content: feedback,
    },
  });

  await prisma.initiative.update({
    where: { id: initiative.id },
    data: { planStatus: "generating" },
  });

  // Invoke Netlify background function
  await invokeBackgroundFunction({
    entityType: "initiative",
    entityId: initiative.id,
    action: "revise_plan",
    title: initiative.title,
    description: initiative.description,
    feedback,
    existingPlan: initiative.aiPlan,
  }, request);

  return NextResponse.json({
    success: true,
    planStatus: "generating",
  });
}

async function handleApprovePlan(initiative: InitiativeWithProject) {
  const approvalMessage = await prisma.planningMessage.create({
    data: {
      initiativeId: initiative.id,
      role: "system",
      type: "approval",
      content: "Spec approved",
    },
  });

  await prisma.initiative.update({
    where: { id: initiative.id },
    data: { planStatus: "approved" },
  });

  return NextResponse.json({
    success: true,
    message: approvalMessage,
    planStatus: "approved",
  });
}

async function handleCreateIssues(initiative: InitiativeWithProject) {
  if (!initiative.aiPlan) {
    return NextResponse.json({ error: "No approved spec" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let plan;
  try {
    plan = JSON.parse(initiative.aiPlan);
  } catch {
    return NextResponse.json({ error: "Invalid plan JSON" }, { status: 400 });
  }

  const tasks = plan.tasks || [];
  if (tasks.length === 0) {
    return NextResponse.json({ error: "No tasks in spec" }, { status: 400 });
  }

  // Get next issue number for the project
  const lastIssue = await prisma.issue.findFirst({
    where: { projectId: initiative.projectId },
    orderBy: { number: "desc" },
  });
  let nextNumber = (lastIssue?.number || 0) + 1;

  const createdIssues = [];
  for (const task of tasks) {
    const issue = await prisma.issue.create({
      data: {
        number: nextNumber++,
        title: task.title || `Task ${task.id}`,
        description: task.description || "",
        type: task.type || "task",
        priority: task.priority || initiative.priority,
        projectId: initiative.projectId,
        createdById: user.id,
        initiativeId: initiative.id,
        aiContext: JSON.stringify({
          fromSpec: true,
          specTaskId: task.id,
          filesToModify: task.filesToModify,
          filesToCreate: task.filesToCreate,
          dependsOn: task.dependsOn,
          verification: task.verification,
          estimateMinutes: task.estimateMinutes,
        }),
        estimate: task.estimateMinutes || null,
      },
    });
    createdIssues.push(issue);
  }

  // Record in planning chat
  await prisma.planningMessage.create({
    data: {
      initiativeId: initiative.id,
      role: "system",
      type: "status_change",
      content: `Created ${createdIssues.length} issues from spec`,
      metadata: JSON.stringify({
        issueIds: createdIssues.map((i) => i.id),
        issueCount: createdIssues.length,
      }),
    },
  });

  // Update initiative status to in_progress
  await prisma.initiative.update({
    where: { id: initiative.id },
    data: { status: "in_progress" },
  });

  return NextResponse.json({
    success: true,
    issueCount: createdIssues.length,
    issues: createdIssues.map((i) => ({ id: i.id, number: i.number, title: i.title })),
  });
}

async function handleComment(initiative: InitiativeWithProject, message: string) {
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const planningMsg = await prisma.planningMessage.create({
    data: {
      initiativeId: initiative.id,
      role: "user",
      type: "text",
      content: message,
    },
  });

  return NextResponse.json({ success: true, message: planningMsg });
}
