import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callClaudeStreaming, estimateCost } from "@/lib/ai/claude";
import { requireAuth, handleAuthError } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IssueWithProject = any;

// Stale generation timeout — if "generating" for more than 2 minutes, auto-reset
const STALE_GENERATION_MS = 2 * 60 * 1000;

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

// --- Streaming helper ---

/**
 * Returns a streaming response that keeps the Netlify function alive
 * while Claude generates content. Writes the result to DB when done.
 */
function streamingClaudeCall(
  issueId: string,
  claudeParams: {
    system: string;
    messages: { role: "user" | "assistant"; content: string }[];
    maxTokens: number;
  },
  issue: IssueWithProject,
  errorResetStatus: string,
  onSuccess: (response: string, parsed: Record<string, unknown>, cost: number, inputTokens: number, outputTokens: number) => Promise<void>,
  onApiKeyError?: () => Promise<void>,
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await callClaudeStreaming({
          ...claudeParams,
          onChunk: () => {
            // Send a heartbeat to keep the connection alive
            controller.enqueue(encoder.encode(" "));
          },
        });

        // Check for API key error
        if (response.includes("ANTHROPIC_API_KEY not configured")) {
          await prisma.planningMessage.create({
            data: {
              issueId,
              role: "system",
              type: "error",
              content: "ANTHROPIC_API_KEY not configured. Set it in .env.local to enable AI features.",
            },
          });
          await prisma.issue.update({
            where: { id: issueId },
            data: { planStatus: errorResetStatus },
          });
          if (onApiKeyError) await onApiKeyError();
          controller.enqueue(encoder.encode(JSON.stringify({ success: false, planStatus: errorResetStatus })));
          controller.close();
          return;
        }

        // Estimate cost
        const inputTokens = Math.ceil(
          claudeParams.messages.reduce((acc, m) => acc + m.content.length, 0) / 4
        );
        const outputTokens = Math.ceil(response.length / 4);
        const cost = estimateCost(inputTokens, outputTokens);

        // Try to parse JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response };

        await onSuccess(response, parsed, cost, inputTokens, outputTokens);

        controller.enqueue(encoder.encode(JSON.stringify({ success: true })));
        controller.close();
      } catch (err) {
        console.error("Streaming Claude call failed:", err);

        await prisma.planningMessage.create({
          data: {
            issueId,
            role: "system",
            type: "error",
            content: "Failed. Please try again.",
            metadata: JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            }),
          },
        });

        await prisma.issue.update({
          where: { id: issueId },
          data: { planStatus: errorResetStatus },
        });

        controller.enqueue(encoder.encode(JSON.stringify({ success: false })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
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

  return streamingClaudeCall(
    issue.id,
    {
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
          role: "user" as const,
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
    },
    issue,
    "none", // resetPlanStatus on error
    async (response, parsed, cost, inputTokens, outputTokens) => {
      const planJson = JSON.stringify(parsed, null, 2);

      // Save plan message
      await prisma.planningMessage.create({
        data: {
          issueId: issue.id,
          role: "assistant",
          type: "plan",
          content: planJson,
          metadata: JSON.stringify({ cost, inputTokens, outputTokens }),
        },
      });

      // Update issue
      await prisma.issue.update({
        where: { id: issue.id },
        data: {
          aiPlan: planJson,
          aiPrompt: (parsed as Record<string, string>).agentPrompt || "",
          planStatus: "ready",
          status: issue.status === "planning" ? "planned" : issue.status,
        },
      });
    },
  );
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

  return streamingClaudeCall(
    issue.id,
    {
      system:
        "You are Lyght's planning agent. Revise the coding plan based on human feedback. Return the complete revised plan in JSON.",
      messages: [
        {
          role: "user" as const,
          content: `Issue: ${issue.title}
Description: ${issue.description}
Original Plan: ${issue.aiPlan}

Human Feedback: ${feedback}

Revise the plan to address the feedback. Return the complete revised plan in the same JSON format.`,
        },
      ],
      maxTokens: 8192,
    },
    issue,
    "ready", // on error, reset to "ready" since we have an existing plan
    async (response, parsed, cost, inputTokens, outputTokens) => {
      const planJson = JSON.stringify(parsed, null, 2);

      await prisma.planningMessage.create({
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
          aiPrompt: (parsed as Record<string, string>).agentPrompt || issue.aiPrompt,
          planStatus: "ready",
        },
      });
    },
  );
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

  // Use streaming to keep the function alive during execution
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await callClaudeStreaming({
          system: agentRun.systemPrompt || undefined,
          messages: [{ role: "user", content: agentRun.prompt }],
          maxTokens: 8192,
          onChunk: () => {
            controller.enqueue(encoder.encode(" "));
          },
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
          controller.enqueue(encoder.encode(JSON.stringify({ success: false })));
          controller.close();
          return;
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
          await prisma.planningMessage.create({
            data: {
              issueId: issue.id,
              role: "assistant",
              type: "blocker",
              content: blockerMessage,
              metadata: JSON.stringify({ runId: agentRun.id, cost }),
            },
          });

          await prisma.reviewItem.create({
            data: {
              type: "question",
              issueId: issue.id,
              content: blockerMessage,
            },
          });
        } else {
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

        controller.enqueue(encoder.encode(JSON.stringify({ success: true, status })));
        controller.close();
      } catch (error) {
        console.error("Agent execution failed:", error);

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

        controller.enqueue(encoder.encode(JSON.stringify({ success: false })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
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

  // Use streaming to keep the function alive during continuation
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await callClaudeStreaming({
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
          onChunk: () => {
            controller.enqueue(encoder.encode(" "));
          },
        });

        // Check for API key error
        if (response.includes("ANTHROPIC_API_KEY not configured")) {
          await prisma.planningMessage.create({
            data: {
              issueId: issue.id,
              role: "system",
              type: "error",
              content: "ANTHROPIC_API_KEY not configured.",
            },
          });
          controller.enqueue(encoder.encode(JSON.stringify({ success: false })));
          controller.close();
          return;
        }

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

        controller.enqueue(encoder.encode(JSON.stringify({ success: true })));
        controller.close();
      } catch (error) {
        console.error("Agent continuation failed:", error);

        await prisma.planningMessage.create({
          data: {
            issueId: issue.id,
            role: "system",
            type: "error",
            content: `Agent execution failed: ${String(error).substring(0, 200)}`,
          },
        });

        controller.enqueue(encoder.encode(JSON.stringify({ success: false })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
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
