import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callClaude, estimateCost } from "@/lib/ai/claude";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  const { runId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { response: humanResponse } = body;

  const agentRun = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: { issue: true },
  });

  if (!agentRun) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update with human response
  await prisma.agentRun.update({
    where: { id: runId },
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
      { role: "user", content: `Human response to your question: ${humanResponse}\n\nPlease continue with the task.` },
    ],
    maxTokens: 8192,
  });

  const inputTokens = Math.ceil((agentRun.prompt.length + (agentRun.output?.length || 0) + humanResponse.length) / 4);
  const outputTokens = Math.ceil(response.length / 4);

  await prisma.agentRun.update({
    where: { id: runId },
    data: {
      output: response,
      status: "completed",
      tokensUsed: agentRun.tokensUsed + inputTokens + outputTokens,
      cost: agentRun.cost + estimateCost(inputTokens, outputTokens),
      iterations: agentRun.iterations + 1,
      completedAt: new Date(),
    },
  });

  await prisma.issue.update({
    where: { id: agentRun.issueId },
    data: { agentOutput: response, status: "in_review" },
  });

  // Sync to planning chat thread
  await prisma.planningMessage.create({
    data: {
      issueId: agentRun.issueId,
      role: "user",
      type: "text",
      content: humanResponse,
    },
  });

  await prisma.planningMessage.create({
    data: {
      issueId: agentRun.issueId,
      role: "assistant",
      type: "agent_output",
      content: response,
      metadata: JSON.stringify({ runId, cost: estimateCost(inputTokens, outputTokens) }),
    },
  });

  // Resolve pending review items
  await prisma.reviewItem.updateMany({
    where: { issueId: agentRun.issueId, status: "pending", type: "question" },
    data: { status: "resolved", resolvedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
