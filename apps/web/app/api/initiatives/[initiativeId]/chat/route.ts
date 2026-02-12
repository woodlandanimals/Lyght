import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callClaude, estimateCost } from "@/lib/ai/claude";
import { getCurrentUser, requireAuth, handleAuthError } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InitiativeWithProject = any;

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
    },
  });

  if (!initiative) {
    return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
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
      return handleGeneratePlan(initiative);

    case "revise_plan":
      return handleRevisePlan(initiative, message);

    case "approve_plan":
      return handleApprovePlan(initiative);

    case "create_issues":
      return handleCreateIssues(initiative);

    case "comment":
    default:
      return handleComment(initiative, message);
  }
}

// --- Helpers ---

async function checkApiKeyError(
  response: string,
  initiativeId: string,
  resetPlanStatus?: string
): Promise<NextResponse | null> {
  if (response.includes("ANTHROPIC_API_KEY not configured")) {
    const errorMessage = await prisma.planningMessage.create({
      data: {
        initiativeId,
        role: "system",
        type: "error",
        content:
          "ANTHROPIC_API_KEY not configured. Set it in .env.local to enable AI features.",
      },
    });

    if (resetPlanStatus) {
      await prisma.initiative.update({
        where: { id: initiativeId },
        data: { planStatus: resetPlanStatus },
      });
    }

    return NextResponse.json(
      { success: false, message: errorMessage, planStatus: resetPlanStatus || "none" },
      { status: 500 }
    );
  }
  return null;
}

// --- Action Handlers ---

async function handleGeneratePlan(initiative: InitiativeWithProject) {
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

  const response = await callClaude({
    system: `You are Lyght's spec agent. You take high-level project descriptions and create detailed technical specifications that can be broken into individual implementation issues.

Your specs must:
- Define the SCOPE clearly with in/out boundaries
- Break down into DISCRETE tasks that can each be a separate issue
- Each task should be independently implementable by an AI coding agent
- Include architecture decisions with rationale
- Identify risks and dependencies between tasks
- Estimate effort per task

When you encounter ambiguity:
- Flag it as a "decision_needed" item
- Provide 2-3 options with tradeoffs
- DO NOT make major architectural decisions — escalate to the human

Output format: JSON matching the CodingPlan schema.`,
    messages: [
      {
        role: "user",
        content: `Project: ${initiative.title}
Description: ${initiative.description}
Workspace: ${initiative.project.name}
Tech Stack: Next.js 16, TypeScript, Prisma, SQLite, Tailwind CSS v4
Repository: ${initiative.project.repoUrl || "N/A"}

Create a technical specification that can be broken into individual issues for AI agents to implement.

Respond in JSON:
{
  "objective": "...",
  "approach": "...",
  "tasks": [
    {
      "id": "T1",
      "title": "Issue title for this task",
      "description": "Detailed description including acceptance criteria",
      "filesToModify": ["path/to/file.ts"],
      "filesToCreate": ["path/to/new.ts"],
      "dependsOn": [],
      "verification": "How to verify this task is done",
      "estimateMinutes": 60,
      "priority": "high",
      "type": "task"
    }
  ],
  "risks": ["..."],
  "totalEstimateMinutes": 480
}`,
      },
    ],
    maxTokens: 8192,
  });

  // Check for API key error
  const apiKeyError = await checkApiKeyError(response, initiative.id, "none");
  if (apiKeyError) return apiKeyError;

  // Estimate cost
  const inputTokens = Math.ceil(
    (initiative.title.length + initiative.description.length + 1200) / 4
  );
  const outputTokens = Math.ceil(response.length / 4);
  const cost = estimateCost(inputTokens, outputTokens);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    const planJson = JSON.stringify(parsed, null, 2);

    // Save plan message
    const planMessage = await prisma.planningMessage.create({
      data: {
        initiativeId: initiative.id,
        role: "assistant",
        type: "plan",
        content: planJson,
        metadata: JSON.stringify({ cost, inputTokens, outputTokens }),
      },
    });

    // Update initiative
    await prisma.initiative.update({
      where: { id: initiative.id },
      data: {
        aiPlan: planJson,
        aiPrompt: parsed.agentPrompt || "",
        planStatus: "ready",
      },
    });

    return NextResponse.json({
      success: true,
      message: planMessage,
      planStatus: "ready",
    });
  } catch {
    const errorMessage = await prisma.planningMessage.create({
      data: {
        initiativeId: initiative.id,
        role: "system",
        type: "error",
        content: "Failed to parse spec. Raw response saved.",
        metadata: JSON.stringify({ raw: response.substring(0, 500) }),
      },
    });

    await prisma.initiative.update({
      where: { id: initiative.id },
      data: { planStatus: "none" },
    });

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

async function handleRevisePlan(initiative: InitiativeWithProject, feedback: string) {
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

  const response = await callClaude({
    system:
      "You are Lyght's spec agent. Revise the technical specification based on human feedback. Return the complete revised spec in JSON.",
    messages: [
      {
        role: "user",
        content: `Project: ${initiative.title}
Description: ${initiative.description}
Original Spec: ${initiative.aiPlan}

Human Feedback: ${feedback}

Revise the spec to address the feedback. Return the complete revised spec in the same JSON format.`,
      },
    ],
    maxTokens: 8192,
  });

  // Check for API key error
  const apiKeyError = await checkApiKeyError(response, initiative.id, "ready");
  if (apiKeyError) return apiKeyError;

  const inputTokens = Math.ceil(
    (initiative.title.length +
      initiative.description.length +
      (initiative.aiPlan?.length || 0) +
      feedback.length) /
      4
  );
  const outputTokens = Math.ceil(response.length / 4);
  const cost = estimateCost(inputTokens, outputTokens);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    const planJson = JSON.stringify(parsed, null, 2);

    const planMessage = await prisma.planningMessage.create({
      data: {
        initiativeId: initiative.id,
        role: "assistant",
        type: "plan",
        content: planJson,
        metadata: JSON.stringify({ cost, inputTokens, outputTokens }),
      },
    });

    await prisma.initiative.update({
      where: { id: initiative.id },
      data: {
        aiPlan: planJson,
        planStatus: "ready",
      },
    });

    return NextResponse.json({
      success: true,
      message: planMessage,
      planStatus: "ready",
    });
  } catch {
    await prisma.planningMessage.create({
      data: {
        initiativeId: initiative.id,
        role: "system",
        type: "error",
        content: "Failed to parse revised spec.",
      },
    });

    await prisma.initiative.update({
      where: { id: initiative.id },
      data: { planStatus: "ready" },
    });

    return NextResponse.json(
      { error: "Failed to parse revised spec" },
      { status: 500 }
    );
  }
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
