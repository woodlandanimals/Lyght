import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IssueWithProject = any;

// Stale generation timeout — if "generating" for more than 2 minutes, auto-reset
const STALE_GENERATION_MS = 2 * 60 * 1000;

/**
 * Invoke the Netlify background function for long-running AI work.
 * Background functions return 202 immediately and run for up to 15 minutes.
 */
async function invokeBackgroundFunction(payload: Record<string, unknown>, request: NextRequest) {
  const origin = request.nextUrl.origin;
  const bgUrl = `${origin}/.netlify/functions/generate-plan-background`;

  console.log(`[issue-chat] Invoking background function: ${bgUrl}`);

  try {
    // Must await — unawaited fetches get killed when the Lambda shuts down.
    // Background functions return 202 instantly so this adds <100ms.
    const res = await fetch(bgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`[issue-chat] Background function responded: ${res.status}`);
  } catch (err) {
    console.error("[issue-chat] Failed to invoke background function:", err);
  }
}

// GET — return all planning messages for an issue
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
    select: {
      id: true,
      aiPlan: true,
      planStatus: true,
      status: true,
      agentOutput: true,
      updatedAt: true,
    },
  });

  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  // Stale generation recovery: if stuck in "generating" for too long, reset
  if (issue.planStatus === "generating") {
    const elapsed = Date.now() - new Date(issue.updatedAt).getTime();
    if (elapsed > STALE_GENERATION_MS) {
      await prisma.issue.update({
        where: { id: issueId },
        data: { planStatus: "none" },
      });

      await prisma.planningMessage.create({
        data: {
          issueId,
          role: "system",
          type: "error",
          content: "Plan generation timed out. Please try again.",
        },
      });

      issue.planStatus = "none";
    }
  }

  // Check if we need to migrate existing data
  const messageCount = await prisma.planningMessage.count({
    where: { issueId },
  });

  if (messageCount === 0 && (issue.aiPlan || issue.agentOutput)) {
    // One-time migration: synthesize messages from existing data
    const migrations = [];

    if (issue.aiPlan) {
      migrations.push({
        issueId,
        role: "assistant",
        type: "plan",
        content: issue.aiPlan,
        metadata: JSON.stringify({ migrated: true }),
      });

      if (issue.planStatus === "approved") {
        migrations.push({
          issueId,
          role: "system",
          type: "approval",
          content: "Plan approved",
          metadata: JSON.stringify({ migrated: true }),
        });
      }
    }

    if (issue.agentOutput) {
      migrations.push({
        issueId,
        role: "assistant",
        type: "agent_output",
        content: issue.agentOutput,
        metadata: JSON.stringify({ migrated: true }),
      });
    }

    if (migrations.length > 0) {
      for (const msg of migrations) {
        await prisma.planningMessage.create({ data: msg });
      }
    }
  }

  const messages = await prisma.planningMessage.findMany({
    where: { issueId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    messages,
    planStatus: issue.planStatus,
    issueStatus: issue.status,
  });
}

// POST — handle all planning interactions
export async function POST(
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

  const { message, action = "comment", runId } = body;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: true },
  });

  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  switch (action) {
    case "generate_plan":
      return handleGeneratePlan(issue, request);

    case "revise_plan":
      return handleRevisePlan(issue, message, request);

    case "approve_plan":
      return handleApprovePlan(issue);

    case "execute":
      return handleExecute(issue, request);

    case "respond":
      return handleRespond(issue, message, runId, request);

    case "comment":
    default:
      return handleComment(issue, message);
  }
}

// --- Action Handlers ---

async function handleGeneratePlan(issue: IssueWithProject, request: NextRequest) {
  // Create "generating" system message
  await prisma.planningMessage.create({
    data: {
      issueId: issue.id,
      role: "system",
      type: "status_change",
      content: "Generating plan...",
    },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: { planStatus: "generating" },
  });

  // Invoke Netlify background function (runs up to 15 min)
  await invokeBackgroundFunction({
    entityType: "issue",
    entityId: issue.id,
    action: "generate_plan",
    title: issue.title,
    description: issue.description,
    projectName: issue.project.name,
    currentStatus: issue.status,
  }, request);

  return NextResponse.json({
    success: true,
    planStatus: "generating",
  });
}

async function handleRevisePlan(issue: IssueWithProject, feedback: string, request: NextRequest) {
  if (!feedback?.trim()) {
    return NextResponse.json(
      { error: "Feedback required" },
      { status: 400 }
    );
  }

  // Save user feedback as a message
  await prisma.planningMessage.create({
    data: {
      issueId: issue.id,
      role: "user",
      type: "text",
      content: feedback,
    },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: { planStatus: "generating" },
  });

  // Invoke Netlify background function
  await invokeBackgroundFunction({
    entityType: "issue",
    entityId: issue.id,
    action: "revise_plan",
    title: issue.title,
    description: issue.description,
    feedback,
    existingPlan: issue.aiPlan,
  }, request);

  return NextResponse.json({
    success: true,
    planStatus: "generating",
  });
}

async function handleApprovePlan(issue: IssueWithProject) {
  const approvalMessage = await prisma.planningMessage.create({
    data: {
      issueId: issue.id,
      role: "system",
      type: "approval",
      content: "Plan approved",
    },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: { planStatus: "approved", status: "ready" },
  });

  return NextResponse.json({
    success: true,
    message: approvalMessage,
    planStatus: "approved",
  });
}

async function handleExecute(issue: IssueWithProject, request: NextRequest) {
  if (!issue.aiPrompt && !issue.aiPlan) {
    return NextResponse.json(
      { error: "No approved plan/prompt" },
      { status: 400 }
    );
  }

  const systemPrompt = `You are a Lyght execution agent implementing a specific task from an approved plan.

RULES:
1. Only implement what the task specifies. Do not scope-creep.
2. Follow the project's existing patterns and conventions.
3. If you encounter a blocker, STOP and report it. Do not guess.
4. Include inline comments explaining non-obvious decisions.
5. Write tests for any new functions.
6. After completion, verify against the task's success criteria.

Report your output as:
{
  "status": "completed" | "blocked" | "needs_review",
  "filesChanged": [...],
  "output": "... code or explanation ...",
  "verification": "... how to verify this works ...",
  "blockerQuestion": "... if blocked, what do you need? ..."
}`;

  // Create system message
  await prisma.planningMessage.create({
    data: {
      issueId: issue.id,
      role: "system",
      type: "status_change",
      content: "Agent executing...",
    },
  });

  // Create agent run
  const agentRun = await prisma.agentRun.create({
    data: {
      issueId: issue.id,
      swarmId: issue.swarmId,
      prompt: issue.aiPrompt || issue.aiPlan || "",
      systemPrompt,
      status: "running",
      startedAt: new Date(),
    },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: { status: "in_progress", agentSessionId: agentRun.id },
  });

  // Invoke Netlify background function
  await invokeBackgroundFunction({
    entityType: "issue",
    entityId: issue.id,
    action: "execute",
    agentRunId: agentRun.id,
    prompt: agentRun.prompt,
    systemPrompt,
  }, request);

  return NextResponse.json({
    success: true,
    agentRunId: agentRun.id,
    status: "running",
  });
}

async function handleRespond(
  issue: IssueWithProject,
  humanResponse: string,
  runId: string | undefined,
  request: NextRequest,
) {
  if (!humanResponse?.trim()) {
    return NextResponse.json(
      { error: "Response required" },
      { status: 400 }
    );
  }

  // Find the agent run
  const agentRun = runId
    ? await prisma.agentRun.findUnique({ where: { id: runId } })
    : await prisma.agentRun.findFirst({
        where: { issueId: issue.id, status: "waiting_review" },
        orderBy: { createdAt: "desc" },
      });

  if (!agentRun) {
    return NextResponse.json(
      { error: "No agent run to respond to" },
      { status: 404 }
    );
  }

  // Save user response in chat
  await prisma.planningMessage.create({
    data: {
      issueId: issue.id,
      role: "user",
      type: "text",
      content: humanResponse,
    },
  });

  // Update agent run
  await prisma.agentRun.update({
    where: { id: agentRun.id },
    data: {
      humanResponse,
      status: "running",
      blockerType: null,
      blockerMessage: null,
    },
  });

  // Invoke Netlify background function
  await invokeBackgroundFunction({
    entityType: "issue",
    entityId: issue.id,
    action: "respond",
    agentRunId: agentRun.id,
    humanResponse,
    previousPrompt: agentRun.prompt,
    previousOutput: agentRun.output,
    systemPrompt: agentRun.systemPrompt,
    agentRunData: {
      id: agentRun.id,
      tokensUsed: agentRun.tokensUsed,
      cost: agentRun.cost,
      iterations: agentRun.iterations,
    },
  }, request);

  return NextResponse.json({ success: true, status: "running" });
}

async function handleComment(issue: IssueWithProject, message: string) {
  if (!message?.trim()) {
    return NextResponse.json(
      { error: "Message required" },
      { status: 400 }
    );
  }

  // Save as planning message
  const planningMsg = await prisma.planningMessage.create({
    data: {
      issueId: issue.id,
      role: "user",
      type: "text",
      content: message,
    },
  });

  // Also save as Comment for backward compat
  await prisma.comment.create({
    data: {
      issueId: issue.id,
      body: message,
      author: "human",
    },
  });

  return NextResponse.json({ success: true, message: planningMsg });
}
