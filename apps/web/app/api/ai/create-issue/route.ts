import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { callClaude } from "@/lib/ai/claude";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, projectId } = await request.json();
  if (!text || !projectId) {
    return NextResponse.json({ error: "text and projectId required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const recentIssues = await prisma.issue.findMany({
    where: { projectId },
    take: 10,
    orderBy: { createdAt: "desc" },
    select: { title: true, status: true },
  });

  const response = await callClaude({
    system: "You are an expert product manager. Given a user request, create a structured issue. Respond ONLY in valid JSON.",
    messages: [
      {
        role: "user",
        content: `User Request: ${text}
Project Context: ${project.name} - ${project.description || "No description"}
Existing Issues: ${recentIssues.map((i) => `${i.title} (${i.status})`).join(", ")}

Respond in JSON:
{
  "title": "concise issue title",
  "description": "detailed markdown description with acceptance criteria",
  "type": "task|bug|feature|epic",
  "priority": "urgent|high|medium|low",
  "tags": ["tag1", "tag2"],
  "estimateMinutes": number
}`,
      },
    ],
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);

    const lastIssue = await prisma.issue.findFirst({
      where: { projectId },
      orderBy: { number: "desc" },
    });

    const issue = await prisma.issue.create({
      data: {
        number: (lastIssue?.number || 0) + 1,
        title: parsed.title,
        description: parsed.description,
        type: parsed.type || "task",
        priority: parsed.priority || "medium",
        tags: Array.isArray(parsed.tags) ? parsed.tags.join(",") : null,
        estimate: parsed.estimateMinutes || null,
        projectId,
        createdById: user.id,
      },
    });

    return NextResponse.json(issue);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw: response }, { status: 500 });
  }
}
