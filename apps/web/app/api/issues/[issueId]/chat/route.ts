import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callClaude, estimateCost } from "@/lib/ai/claude";

// GET — return all planning messages for an issue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const { issueId } = await params;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      aiPlan: true,
      planStatus: true,
      status: true,
      agentOutput: true,
    },
  });

  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
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
  const { issueId } = await params;
  const body = await request.json();
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
      return handleGeneratePlan(issue);

    case "revise_plan":
      return handleRevisePlan(issue, message);

    case "approve_plan":
      return handleApprovePlan(issue);

    case "execute":
      return handleExecute(issue);

    case "respond":
      return handleRespond(issue, message, runId);

    case "comment":
    default:
      return handleComment(issue, message);
  }
}

// --- Helpers ---

async function checkApiKeyError(
  response: string,
  issueId: string,
  resetPlanStatus?: string
): Promise<NextResponse | null> {
  if (response.includes("ANTHROPIC_API_KEY not configured")) {
    const errorMessage = await prisma.planningMessage.create({
      data: {
        issueId,
        role: "system",
        type: "error",
        content:
          "ANTHROPIC_API_KEY not configured. Set it in .env.local to enable AI features.",
      },
    });

    if (resetPlanStatus) {
      await prisma.issue.update({
        where: { id: issueId },
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

async function handleGeneratePlan(issue: IssueWithProject) {
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

  const response = await callClaude({
    system: `You are Lyght's planning agent. You decompose software issues into executable task plans for AI coding agents.

Your plans must be:
- ATOMIC: Each task fits in ~50% of a 200k token context window
- ORDERED: Dependencies are explicit (task IDs)
- VERIFIABLE: Each task has a machine-checkable "done" condition
- SPECIFIC: Reference actual file paths, function names, patterns

When you encounter ambiguity:
- Flag it as a "decision_needed" item
- Provide 2-3 options with tradeoffs
- DO NOT make architectural decisions — escalate to the human

Output format: JSON matching the CodingPlan schema.`,
    messages: [
      {
        role: "user",
        content: `Issue: ${issue.title}
Description: ${issue.description}
Project: ${issue.project.name}
Tech Stack: Next.js 16, TypeScript, Prisma, SQLite, Tailwind CSS v4

Create a Coding Plan that an AI agent can execute autonomously.

Respond in JSON:
{
  "objective": "...",
  "approach": "...",
  "tasks": [
    {
      "id": "T1",
      "title": "...",
      "description": "...",
      "filesToModify": ["path/to/file.ts"],
      "filesToCreate": ["path/to/new.ts"],
      "dependsOn": [],
      "verification": "...",
      "estimateMinutes": number
    }
  ],
  "agentPrompt": "Complete executable prompt for the coding agent...",
  "risks": ["..."],
  "totalEstimateMinutes": number
}`,
      },
    ],
    maxTokens: 8192,
  });

  // Check for API key error
  const apiKeyError = await checkApiKeyError(response, issue.id, "none");
  if (apiKeyError) return apiKeyError;

  // Estimate cost
  const inputTokens = Math.ceil(
    (issue.title.length + issue.description.length + 800) / 4
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
        issueId: issue.id,
        role: "assistant",
        type: "plan",
        content: planJson,
        metadata: JSON.stringify({
          cost,
          inputTokens,
          outputTokens,
        }),
      },
    });

    // Update issue
    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        aiPlan: planJson,
        aiPrompt: parsed.agentPrompt || "",
        planStatus: "ready",
        status: issue.status === "planning" ? "planned" : issue.status,
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
        issueId: issue.id,
        role: "system",
        type: "error",
        content: "Failed to parse plan. Raw response saved.",
        metadata: JSON.stringify({ raw: response.substring(0, 500) }),
      },
    });

    await prisma.issue.update({
      where: { id: issue.id },
      data: { planStatus: "none" },
    });

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

async function handleRevisePlan(issue: IssueWithProject, feedback: string) {
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

  const response = await callClaude({
    system:
      "You are Lyght's planning agent. Revise the coding plan based on human feedback. Return the complete revised plan in JSON.",
    messages: [
      {
        role: "user",
        content: `Issue: ${issue.title}
Description: ${issue.description}
Original Plan: ${issue.aiPlan}

Human Feedback: ${feedback}

Revise the plan to address the feedback. Return the complete revised plan in the same JSON format.`,
      },
    ],
    maxTokens: 8192,
  });

  // Check for API key error
  const apiKeyError = await checkApiKeyError(response, issue.id, "ready");
  if (apiKeyError) return apiKeyError;

  const inputTokens = Math.ceil(
    (issue.title.length +
      issue.description.length +
      (issue.aiPlan?.length || 0) +
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
        issueId: issue.id,
        role: "assistant",
        type: "plan",
        content: planJson,
        metadata: JSON.stringify({ cost, inputTokens, outputTokens }),
      },
    });

    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        aiPlan: planJson,
        aiPrompt: parsed.agentPrompt || issue.aiPrompt,
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
        issueId: issue.id,
        role: "system",
        type: "error",
        content: "Failed to parse revised plan.",
      },
    });

    await prisma.issue.update({
      where: { id: issue.id },
      data: { planStatus: "ready" },
    });

    return NextResponse.json(
      { error: "Failed to parse revised plan" },
      { status: 500 }
    );
  }
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

async function handleExecute(issue: IssueWithProject) {
  if (!issue.aiPrompt && !issue.aiPlan) {
    return NextResponse.json(
      { error: "No approved plan/prompt" },
      { status: 400 }
    );
  }

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
      systemPrompt: `You are a Lyght execution agent implementing a specific task from an approved plan.

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
}`,
      status: "running",
      startedAt: new Date(),
    },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: { status: "in_progress", agentSessionId: agentRun.id },
  });

  try {
    const response = await callClaude({
      system: agentRun.systemPrompt || undefined,
      messages: [{ role: "user", content: agentRun.prompt }],
      maxTokens: 8192,
    });

    // Check for API key error
    if (response.includes("ANTHROPIC_API_KEY not configured")) {
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: { status: "failed", output: "API key not configured" },
      });
      await prisma.planningMessage.create({
        data: {
          issueId: issue.id,
          role: "system",
          type: "error",
          content: "ANTHROPIC_API_KEY not configured. Set it in .env.local to enable AI features.",
        },
      });
      await prisma.issue.update({
        where: { id: issue.id },
        data: { status: issue.status },
      });
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const inputTokens = Math.ceil(agentRun.prompt.length / 4);
    const outputTokens = Math.ceil(response.length / 4);
    const cost = estimateCost(inputTokens, outputTokens);

    // Try to parse structured response
    let status = "completed";
    let blockerType = null;
    let blockerMessage = null;

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.status === "blocked" && parsed.blockerQuestion) {
          status = "waiting_review";
          blockerType = "question";
          blockerMessage = parsed.blockerQuestion;
        }
      }
    } catch {
      // Not JSON, treat as completed
    }

    // Update agent run
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status,
        output: response,
        tokensUsed: inputTokens + outputTokens,
        cost,
        iterations: 1,
        completedAt: status === "completed" ? new Date() : null,
        blockerType,
        blockerMessage,
      },
    });

    // Update issue
    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        agentOutput: response,
        status: "in_review",
      },
    });

    if (status === "waiting_review" && blockerMessage) {
      // Create blocker message in chat
      await prisma.planningMessage.create({
        data: {
          issueId: issue.id,
          role: "assistant",
          type: "blocker",
          content: blockerMessage,
          metadata: JSON.stringify({ runId: agentRun.id, cost }),
        },
      });

      // Create review item for AG-DASH
      await prisma.reviewItem.create({
        data: {
          type: "question",
          issueId: issue.id,
          content: blockerMessage,
        },
      });
    } else {
      // Create agent output message in chat
      await prisma.planningMessage.create({
        data: {
          issueId: issue.id,
          role: "assistant",
          type: "agent_output",
          content: response,
          metadata: JSON.stringify({ runId: agentRun.id, cost }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      agentRunId: agentRun.id,
      status,
    });
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: { status: "failed", output: String(error) },
    });

    await prisma.planningMessage.create({
      data: {
        issueId: issue.id,
        role: "system",
        type: "error",
        content: `Agent execution failed: ${String(error).substring(0, 200)}`,
      },
    });

    return NextResponse.json(
      { error: "Agent execution failed" },
      { status: 500 }
    );
  }
}

async function handleRespond(
  issue: IssueWithProject,
  humanResponse: string,
  runId?: string
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

  // Re-run agent with context
  const response = await callClaude({
    system: agentRun.systemPrompt || undefined,
    messages: [
      { role: "user", content: agentRun.prompt },
      { role: "assistant", content: agentRun.output || "" },
      {
        role: "user",
        content: `Human response to your question: ${humanResponse}\n\nPlease continue with the task.`,
      },
    ],
    maxTokens: 8192,
  });

  // Check for API key error
  const respondApiKeyError = await checkApiKeyError(response, issue.id);
  if (respondApiKeyError) return respondApiKeyError;

  const inputTokens = Math.ceil(
    (agentRun.prompt.length +
      (agentRun.output?.length || 0) +
      humanResponse.length) /
      4
  );
  const outputTokens = Math.ceil(response.length / 4);
  const cost = estimateCost(inputTokens, outputTokens);

  await prisma.agentRun.update({
    where: { id: agentRun.id },
    data: {
      output: response,
      status: "completed",
      tokensUsed: agentRun.tokensUsed + inputTokens + outputTokens,
      cost: agentRun.cost + cost,
      iterations: agentRun.iterations + 1,
      completedAt: new Date(),
    },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: { agentOutput: response, status: "in_review" },
  });

  // Save agent response in chat
  await prisma.planningMessage.create({
    data: {
      issueId: issue.id,
      role: "assistant",
      type: "agent_output",
      content: response,
      metadata: JSON.stringify({ runId: agentRun.id, cost }),
    },
  });

  // Resolve pending review items
  await prisma.reviewItem.updateMany({
    where: { issueId: issue.id, status: "pending", type: "question" },
    data: { status: "resolved", resolvedAt: new Date() },
  });

  return NextResponse.json({ success: true });
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IssueWithProject = any;
