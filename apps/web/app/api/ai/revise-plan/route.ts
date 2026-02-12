import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callClaude } from "@/lib/ai/claude";

export async function POST(request: NextRequest) {
  const { issueId, feedback } = await request.json();
  if (!issueId || !feedback) {
    return NextResponse.json({ error: "issueId and feedback required" }, { status: 400 });
  }

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: true },
  });

  if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

  await prisma.issue.update({
    where: { id: issueId },
    data: { planStatus: "generating" },
  });

  const response = await callClaude({
    system: "You are Lyght's planning agent. Revise the coding plan based on human feedback. Return the complete revised plan in JSON.",
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

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);

    await prisma.issue.update({
      where: { id: issueId },
      data: {
        aiPlan: JSON.stringify(parsed, null, 2),
        aiPrompt: parsed.agentPrompt || issue.aiPrompt,
        planStatus: "ready",
      },
    });

    return NextResponse.json({ success: true, plan: parsed });
  } catch {
    await prisma.issue.update({
      where: { id: issueId },
      data: { planStatus: "ready" },
    });
    return NextResponse.json({ error: "Failed to parse revised plan", raw: response }, { status: 500 });
  }
}
