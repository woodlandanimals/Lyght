import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, projectName, projectKey } = body;

  if (!name || !email || !projectName || !projectKey) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  // Create or find user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { name, email, role: "admin" },
    });
  }

  // Check if project key exists
  const existingProject = await prisma.project.findUnique({ where: { key: projectKey } });
  if (existingProject) {
    return NextResponse.json({ error: "Project key already exists" }, { status: 400 });
  }

  // Create project
  const project = await prisma.project.create({
    data: {
      name: projectName,
      key: projectKey,
      description: `${projectName} — managed by Lyght`,
      members: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
    },
  });

  // Create sample issues
  const sampleIssues = [
    {
      number: 1,
      title: "Set up project scaffold and configuration",
      description: "Initialize the project with the correct tech stack, configure build tools, and set up the development environment.",
      status: "done",
      priority: "high",
      type: "task",
      tags: "setup,infrastructure",
    },
    {
      number: 2,
      title: "Design and implement user authentication",
      description: "Build a complete authentication system with login, registration, and session management.",
      status: "in_progress",
      priority: "high",
      type: "feature",
      tags: "auth,security",
    },
    {
      number: 3,
      title: "Create REST API endpoints for core resources",
      description: "Implement CRUD API routes for the main data models. Include input validation and error handling.",
      status: "planning",
      priority: "medium",
      type: "task",
      tags: "api,backend",
    },
    {
      number: 4,
      title: "Build dashboard UI with data visualization",
      description: "Create the main dashboard view with charts, stats, and activity feed. Use the design system components.",
      status: "triage",
      priority: "medium",
      type: "feature",
      tags: "ui,dashboard",
    },
    {
      number: 5,
      title: "Fix incorrect date formatting in activity log",
      description: "Dates in the activity log show as raw ISO strings instead of human-readable format. Need to add proper date formatting.",
      status: "triage",
      priority: "low",
      type: "bug",
      tags: "bug,ui",
    },
  ];

  for (const issue of sampleIssues) {
    await prisma.issue.create({
      data: {
        ...issue,
        projectId: project.id,
        createdById: user.id,
      },
    });
  }

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set("lyght-session", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return NextResponse.json({ projectId: project.id, userId: user.id });
}
