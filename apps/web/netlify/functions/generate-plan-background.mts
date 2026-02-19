/**
 * Netlify Background Function for AI plan/spec generation.
 *
 * Background functions can run up to 15 minutes, bypassing the
 * 10-26s timeout on regular Netlify serverless functions.
 *
 * The client receives a 202 immediately; this function runs in
 * the background and writes results directly to the database.
 * The frontend polls via SWR to pick up the results.
 */
import type { Context } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

const prisma = new PrismaClient();

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    return null;
  }
  return new Anthropic({ apiKey });
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}

interface GenerateRequest {
  entityType: "initiative" | "issue";
  entityId: string;
  action: "generate_plan" | "revise_plan" | "execute" | "respond";
  // For generate_plan
  title?: string;
  description?: string;
  projectName?: string;
  repoUrl?: string;
  // For revise_plan
  feedback?: string;
  existingPlan?: string;
  // For execute
  prompt?: string;
  systemPrompt?: string;
  agentRunId?: string;
  // For respond (continue agent)
  humanResponse?: string;
  previousOutput?: string;
  previousPrompt?: string;
  agentRunData?: {
    id: string;
    tokensUsed: number;
    cost: number;
    iterations: number;
  };
  // Current status for conditional updates
  currentStatus?: string;
}

export default async (req: Request, _context: Context) => {
  try {
    const body: GenerateRequest = await req.json();
    const { entityType, entityId, action } = body;

    console.log(`[background] Starting ${action} for ${entityType} ${entityId}`);

    switch (action) {
      case "generate_plan":
        if (entityType === "initiative") {
          await generateInitiativeSpec(body);
        } else {
          await generateIssuePlan(body);
        }
        break;
      case "revise_plan":
        if (entityType === "initiative") {
          await reviseInitiativeSpec(body);
        } else {
          await reviseIssuePlan(body);
        }
        break;
      case "execute":
        await executeAgent(body);
        break;
      case "respond":
        await continueAgent(body);
        break;
      default:
        console.error(`[background] Unknown action: ${action}`);
    }

    console.log(`[background] Completed ${action} for ${entityType} ${entityId}`);
  } catch (err) {
    console.error("[background] Top-level error:", err);
  } finally {
    await prisma.$disconnect();
  }

  return new Response();
};

// --- Helpers ---

async function callClaude(params: {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}): Promise<string> {
  const client = getAnthropicClient();
  if (!client) {
    return "ANTHROPIC_API_KEY not configured";
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: params.maxTokens || 8192,
    temperature: 0.3,
    system: params.system,
    messages: params.messages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

// --- Initiative Spec Generation ---

async function generateInitiativeSpec(body: GenerateRequest) {
  const { entityId, title, description, projectName, repoUrl } = body;

  try {
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
          content: `Project: ${title}
Description: ${description}
Workspace: ${projectName}
Tech Stack: Next.js 16, TypeScript, Prisma, SQLite, Tailwind CSS v4
Repository: ${repoUrl || "N/A"}

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

    if (response.includes("ANTHROPIC_API_KEY not configured")) {
      await handleApiKeyError(entityId, "initiative");
      return;
    }

    const inputTokens = Math.ceil(((title?.length || 0) + (description?.length || 0) + 1200) / 4);
    const outputTokens = Math.ceil(response.length / 4);
    const cost = estimateCost(inputTokens, outputTokens);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    const planJson = JSON.stringify(parsed, null, 2);

    await prisma.planningMessage.create({
      data: {
        initiativeId: entityId,
        role: "assistant",
        type: "plan",
        content: planJson,
        metadata: JSON.stringify({ cost, inputTokens, outputTokens }),
      },
    });

    await prisma.initiative.update({
      where: { id: entityId },
      data: {
        aiPlan: planJson,
        aiPrompt: parsed.agentPrompt || "",
        planStatus: "ready",
      },
    });
  } catch (err) {
    console.error("[background] Initiative spec generation failed:", err);
    await handleError(entityId, "initiative", "Failed to generate spec. Please try again.", err, "none");
  }
}

async function reviseInitiativeSpec(body: GenerateRequest) {
  const { entityId, title, description, feedback, existingPlan } = body;

  try {
    const response = await callClaude({
      system: "You are Lyght's spec agent. Revise the technical specification based on human feedback. Return the complete revised spec in JSON.",
      messages: [
        {
          role: "user",
          content: `Project: ${title}
Description: ${description}
Original Spec: ${existingPlan}

Human Feedback: ${feedback}

Revise the spec to address the feedback. Return the complete revised spec in the same JSON format.`,
        },
      ],
      maxTokens: 8192,
    });

    if (response.includes("ANTHROPIC_API_KEY not configured")) {
      await handleApiKeyError(entityId, "initiative");
      await prisma.initiative.update({ where: { id: entityId }, data: { planStatus: "ready" } });
      return;
    }

    const inputTokens = Math.ceil(((title?.length || 0) + (description?.length || 0) + (existingPlan?.length || 0) + (feedback?.length || 0)) / 4);
    const outputTokens = Math.ceil(response.length / 4);
    const cost = estimateCost(inputTokens, outputTokens);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    const planJson = JSON.stringify(parsed, null, 2);

    await prisma.planningMessage.create({
      data: {
        initiativeId: entityId,
        role: "assistant",
        type: "plan",
        content: planJson,
        metadata: JSON.stringify({ cost, inputTokens, outputTokens }),
      },
    });

    await prisma.initiative.update({
      where: { id: entityId },
      data: {
        aiPlan: planJson,
        aiPrompt: parsed.agentPrompt || "",
        planStatus: "ready",
      },
    });
  } catch (err) {
    console.error("[background] Initiative spec revision failed:", err);
    await handleError(entityId, "initiative", "Failed to revise spec. Please try again.", err, "ready");
  }
}

// --- Issue Plan Generation ---

async function generateIssuePlan(body: GenerateRequest) {
  const { entityId, title, description, projectName, currentStatus } = body;

  try {
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
          content: `Issue: ${title}
Description: ${description}
Project: ${projectName}
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

    if (response.includes("ANTHROPIC_API_KEY not configured")) {
      await handleApiKeyError(entityId, "issue");
      return;
    }

    const inputTokens = Math.ceil(((title?.length || 0) + (description?.length || 0) + 800) / 4);
    const outputTokens = Math.ceil(response.length / 4);
    const cost = estimateCost(inputTokens, outputTokens);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    const planJson = JSON.stringify(parsed, null, 2);

    await prisma.planningMessage.create({
      data: {
        issueId: entityId,
        role: "assistant",
        type: "plan",
        content: planJson,
        metadata: JSON.stringify({ cost, inputTokens, outputTokens }),
      },
    });

    await prisma.issue.update({
      where: { id: entityId },
      data: {
        aiPlan: planJson,
        aiPrompt: parsed.agentPrompt || "",
        planStatus: "ready",
        status: currentStatus,
      },
    });
  } catch (err) {
    console.error("[background] Issue plan generation failed:", err);
    await handleError(entityId, "issue", "Failed to generate plan. Please try again.", err, "none");
  }
}

async function reviseIssuePlan(body: GenerateRequest) {
  const { entityId, title, description, feedback, existingPlan } = body;

  try {
    const response = await callClaude({
      system: "You are Lyght's planning agent. Revise the coding plan based on human feedback. Return the complete revised plan in JSON.",
      messages: [
        {
          role: "user",
          content: `Issue: ${title}
Description: ${description}
Original Plan: ${existingPlan}

Human Feedback: ${feedback}

Revise the plan to address the feedback. Return the complete revised plan in the same JSON format.`,
        },
      ],
      maxTokens: 8192,
    });

    if (response.includes("ANTHROPIC_API_KEY not configured")) {
      await handleApiKeyError(entityId, "issue");
      await prisma.issue.update({ where: { id: entityId }, data: { planStatus: "ready" } });
      return;
    }

    const inputTokens = Math.ceil(((title?.length || 0) + (description?.length || 0) + (existingPlan?.length || 0) + (feedback?.length || 0)) / 4);
    const outputTokens = Math.ceil(response.length / 4);
    const cost = estimateCost(inputTokens, outputTokens);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    const planJson = JSON.stringify(parsed, null, 2);

    await prisma.planningMessage.create({
      data: {
        issueId: entityId,
        role: "assistant",
        type: "plan",
        content: planJson,
        metadata: JSON.stringify({ cost, inputTokens, outputTokens }),
      },
    });

    await prisma.issue.update({
      where: { id: entityId },
      data: {
        aiPlan: planJson,
        aiPrompt: parsed.agentPrompt || "",
        planStatus: "ready",
      },
    });
  } catch (err) {
    console.error("[background] Issue plan revision failed:", err);
    await handleError(entityId, "issue", "Failed to revise plan. Please try again.", err, "ready");
  }
}

// --- Agent Execution ---

async function executeAgent(body: GenerateRequest) {
  const { entityId, agentRunId, prompt, systemPrompt } = body;

  if (!agentRunId || !prompt) {
    console.error("[background] Missing agentRunId or prompt for execute");
    return;
  }

  try {
    const response = await callClaude({
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 8192,
    });

    if (response.includes("ANTHROPIC_API_KEY not configured")) {
      await prisma.agentRun.update({
        where: { id: agentRunId },
        data: { status: "failed", output: "API key not configured" },
      });
      await prisma.planningMessage.create({
        data: {
          issueId: entityId,
          role: "system",
          type: "error",
          content: "ANTHROPIC_API_KEY not configured. Set it in .env.local to enable AI features.",
        },
      });
      return;
    }

    const inputTokens = Math.ceil(prompt.length / 4);
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

    await prisma.agentRun.update({
      where: { id: agentRunId },
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

    await prisma.issue.update({
      where: { id: entityId },
      data: { agentOutput: response, status: "review" },
    });

    if (status === "waiting_review" && blockerMessage) {
      await prisma.planningMessage.create({
        data: {
          issueId: entityId,
          role: "assistant",
          type: "blocker",
          content: blockerMessage,
          metadata: JSON.stringify({ runId: agentRunId, cost }),
        },
      });
      await prisma.reviewItem.create({
        data: { type: "question", issueId: entityId, content: blockerMessage },
      });
    } else {
      await prisma.planningMessage.create({
        data: {
          issueId: entityId,
          role: "assistant",
          type: "agent_output",
          content: response,
          metadata: JSON.stringify({ runId: agentRunId, cost }),
        },
      });
    }
  } catch (err) {
    console.error("[background] Agent execution failed:", err);
    await prisma.agentRun.update({
      where: { id: agentRunId },
      data: { status: "failed", output: String(err) },
    });
    await prisma.planningMessage.create({
      data: {
        issueId: entityId,
        role: "system",
        type: "error",
        content: `Agent execution failed: ${String(err).substring(0, 200)}`,
      },
    });
  }
}

// --- Agent Continuation ---

async function continueAgent(body: GenerateRequest) {
  const { entityId, agentRunId, humanResponse, previousPrompt, previousOutput, systemPrompt, agentRunData } = body;

  if (!agentRunId || !humanResponse || !previousPrompt) {
    console.error("[background] Missing required fields for respond");
    return;
  }

  try {
    const response = await callClaude({
      system: systemPrompt,
      messages: [
        { role: "user", content: previousPrompt },
        { role: "assistant", content: previousOutput || "" },
        {
          role: "user",
          content: `Human response to your question: ${humanResponse}\n\nPlease continue with the task.`,
        },
      ],
      maxTokens: 8192,
    });

    if (response.includes("ANTHROPIC_API_KEY not configured")) {
      await prisma.planningMessage.create({
        data: {
          issueId: entityId,
          role: "system",
          type: "error",
          content: "ANTHROPIC_API_KEY not configured.",
        },
      });
      return;
    }

    const inputTokens = Math.ceil((previousPrompt.length + (previousOutput?.length || 0) + humanResponse.length) / 4);
    const outputTokens = Math.ceil(response.length / 4);
    const cost = estimateCost(inputTokens, outputTokens);

    const prevTokens = agentRunData?.tokensUsed || 0;
    const prevCost = agentRunData?.cost || 0;
    const prevIterations = agentRunData?.iterations || 0;

    await prisma.agentRun.update({
      where: { id: agentRunId },
      data: {
        output: response,
        status: "completed",
        tokensUsed: prevTokens + inputTokens + outputTokens,
        cost: prevCost + cost,
        iterations: prevIterations + 1,
        completedAt: new Date(),
      },
    });

    await prisma.issue.update({
      where: { id: entityId },
      data: { agentOutput: response, status: "review" },
    });

    await prisma.planningMessage.create({
      data: {
        issueId: entityId,
        role: "assistant",
        type: "agent_output",
        content: response,
        metadata: JSON.stringify({ runId: agentRunId, cost }),
      },
    });

    await prisma.reviewItem.updateMany({
      where: { issueId: entityId, status: "pending", type: "question" },
      data: { status: "resolved", resolvedAt: new Date() },
    });
  } catch (err) {
    console.error("[background] Agent continuation failed:", err);
    await prisma.planningMessage.create({
      data: {
        issueId: entityId,
        role: "system",
        type: "error",
        content: `Agent execution failed: ${String(err).substring(0, 200)}`,
      },
    });
  }
}

// --- Error Helpers ---

async function handleApiKeyError(entityId: string, entityType: "initiative" | "issue") {
  const data = {
    role: "system",
    type: "error",
    content: "ANTHROPIC_API_KEY not configured. Set it in .env.local to enable AI features.",
  };

  if (entityType === "initiative") {
    await prisma.planningMessage.create({ data: { ...data, initiativeId: entityId } });
    await prisma.initiative.update({ where: { id: entityId }, data: { planStatus: "none" } });
  } else {
    await prisma.planningMessage.create({ data: { ...data, issueId: entityId } });
    await prisma.issue.update({ where: { id: entityId }, data: { planStatus: "none" } });
  }
}

async function handleError(
  entityId: string,
  entityType: "initiative" | "issue",
  message: string,
  err: unknown,
  resetStatus: string,
) {
  const metadata = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
  const msgData = { role: "system", type: "error", content: message, metadata };

  if (entityType === "initiative") {
    await prisma.planningMessage.create({ data: { ...msgData, initiativeId: entityId } });
    await prisma.initiative.update({ where: { id: entityId }, data: { planStatus: resetStatus } });
  } else {
    await prisma.planningMessage.create({ data: { ...msgData, issueId: entityId } });
    await prisma.issue.update({ where: { id: entityId }, data: { planStatus: resetStatus } });
  }
}
