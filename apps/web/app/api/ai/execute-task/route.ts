import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callClaude, callClaudeWithTools, estimateCost } from "@/lib/ai/claude";
import { isClaudeToolsEnabled, getProjectTools } from "@/lib/mcp/client";
import { mcpToolsToAnthropicTools, createToolHandler } from "@/lib/mcp/tool-bridge";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { issueId } = body;
  if (!issueId) return NextResponse.json({ error: "issueId required" }, { status: 400 });

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: true },
  });

  if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  if (!issue.aiPrompt && !issue.aiPlan) {
    return NextResponse.json({ error: "No approved plan/prompt" }, { status: 400 });
  }

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

  // Update issue status
  await prisma.issue.update({
    where: { id: issueId },
    data: { status: "make", agentSessionId: agentRun.id },
  });

  try {
    // Check if MCP tools are available for this project
    const useTools = await isClaudeToolsEnabled(issue.projectId);
    let response: string;
    let toolCallCount = 0;

    if (useTools) {
      // Load MCP tools and use enhanced Claude with tool-use
      const mcpTools = await getProjectTools(issue.projectId);
      const anthropicTools = mcpToolsToAnthropicTools(mcpTools);
      const { handler, getToolCalls } = createToolHandler(mcpTools);

      if (anthropicTools.length > 0) {
        const result = await callClaudeWithTools({
          system: (agentRun.systemPrompt || "") +
            "\n\nYou have access to external tools. Use them when they can help complete the task (e.g., fetch designs from Figma, search Slack for context).",
          messages: [{ role: "user", content: agentRun.prompt }],
          tools: anthropicTools,
          maxTokens: 8192,
          onToolCall: handler,
        });
        response = result.text;
        toolCallCount = result.toolCallCount;

        // Log tool calls in agent run metadata
        const toolCalls = getToolCalls();
        if (toolCalls.length > 0) {
          await prisma.agentRun.update({
            where: { id: agentRun.id },
            data: {
              output: JSON.stringify({ toolCalls, pendingResponse: true }),
            },
          });
        }
      } else {
        // No tools available despite claude-tools being enabled — fall back
        response = await callClaude({
          system: agentRun.systemPrompt || undefined,
          messages: [{ role: "user", content: agentRun.prompt }],
          maxTokens: 8192,
        });
      }
    } else {
      // Standard execution without MCP tools
      response = await callClaude({
        system: agentRun.systemPrompt || undefined,
        messages: [{ role: "user", content: agentRun.prompt }],
        maxTokens: 8192,
      });
    }

    // Estimate tokens (rough approximation)
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
        iterations: 1 + toolCallCount,
        completedAt: status === "completed" ? new Date() : null,
        blockerType,
        blockerMessage,
      },
    });

    // Update issue
    await prisma.issue.update({
      where: { id: issueId },
      data: {
        agentOutput: response,
        status: "review",
      },
    });

    // Create review item if blocked
    if (status === "waiting_review" && blockerMessage) {
      await prisma.reviewItem.create({
        data: {
          type: "question",
          issueId: issue.id,
          content: blockerMessage,
        },
      });
    }

    return NextResponse.json({ success: true, agentRunId: agentRun.id, status });
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: { status: "failed", output: String(error) },
    });

    return NextResponse.json({ error: "Agent execution failed" }, { status: 500 });
  }
}
