import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callClaude } from "@/lib/ai/claude";

export async function POST(request: NextRequest) {
  const { issueId } = await request.json();
  if (!issueId) return NextResponse.json({ error: "issueId required" }, { status: 400 });

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: true },
  });

  if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

  // Set planStatus to generating
  await prisma.issue.update({
    where: { id: issueId },
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
Tech Stack: Next.js 14, TypeScript, Prisma, SQLite, Tailwind CSS

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

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);

    await prisma.issue.update({
      where: { id: issueId },
      data: {
        aiPlan: JSON.stringify(parsed, null, 2),
        aiPrompt: parsed.agentPrompt || "",
        planStatus: "ready",
        status: issue.status === "planning" ? "planned" : issue.status,
      },
    });

    return NextResponse.json({ success: true, plan: parsed });
  } catch {
    await prisma.issue.update({
      where: { id: issueId },
      data: { planStatus: "none" },
    });
    return NextResponse.json({ error: "Failed to parse plan", raw: response }, { status: 500 });
  }
}
