import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit onboarding to prevent abuse
  const clientIp = request.headers.get("x-forwarded-for") || "anonymous";
  const { allowed } = rateLimit(`onboarding:${clientIp}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, email, projectName, projectKey } = body;

  if (!name || !email || !projectName || !projectKey) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  // Basic email validation
  if (typeof email !== "string" || !email.includes("@") || email.length > 255) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Sanitize project key — alphanumeric and hyphens only, max 10 chars
  const sanitizedKey = String(projectKey).toUpperCase().replace(/[^A-Z0-9-]/g, "").substring(0, 10);
  if (!sanitizedKey || sanitizedKey.length < 2) {
    return NextResponse.json({ error: "Project key must be 2-10 alphanumeric characters" }, { status: 400 });
  }

  // Create or find user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { name: String(name).substring(0, 100), email, role: "admin" },
    });
  }

  // Check if project key exists
  const existingProject = await prisma.project.findUnique({ where: { key: sanitizedKey } });
  if (existingProject) {
    // If user is already a member, just log them in
    const membership = await prisma.projectMember.findFirst({
      where: { userId: user.id, projectId: existingProject.id },
    });
    if (membership) {
      const cookieStore = await cookies();
      cookieStore.set("lyght-session", user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
      return NextResponse.json({ projectId: existingProject.id, userId: user.id });
    }
    return NextResponse.json({ error: "Project key already exists" }, { status: 400 });
  }

  // Create project
  const project = await prisma.project.create({
    data: {
      name: String(projectName).substring(0, 100),
      key: sanitizedKey,
      description: `${String(projectName).substring(0, 100)} — managed by Lyght`,
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
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return NextResponse.json({ projectId: project.id, userId: user.id });
}
