import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for") || "anonymous";
  const { allowed } = rateLimit(`signup:${clientIp}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orgName, name, email, password, workspaceName, projectName, projectKey } = body;

  if (!orgName || !name || !email || !password || !workspaceName || !projectName || !projectKey) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  if (typeof email !== "string" || !email.includes("@") || email.length > 255) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const sanitizedKey = String(projectKey).toUpperCase().replace(/[^A-Z0-9-]/g, "").substring(0, 10);
  if (!sanitizedKey || sanitizedKey.length < 2) {
    return NextResponse.json({ error: "Project key must be 2-10 alphanumeric characters" }, { status: 400 });
  }

  // Generate org slug from name
  const orgSlug = String(orgName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);

  if (!orgSlug) {
    return NextResponse.json({ error: "Invalid organization name" }, { status: 400 });
  }

  // Generate workspace slug
  const workspaceSlug = String(workspaceName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);

  if (!workspaceSlug) {
    return NextResponse.json({ error: "Invalid workspace name" }, { status: 400 });
  }

  // Check uniqueness
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "Email already registered" }, { status: 400 });
  }

  const existingOrg = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (existingOrg) {
    return NextResponse.json({ error: "Organization name already taken" }, { status: 400 });
  }

  const existingProject = await prisma.project.findUnique({ where: { key: sanitizedKey } });
  if (existingProject) {
    return NextResponse.json({ error: "Project key already exists" }, { status: 400 });
  }

  const passwordHash = hashPassword(password);

  // Create everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: String(orgName).substring(0, 100),
        slug: orgSlug,
      },
    });

    const user = await tx.user.create({
      data: {
        name: String(name).substring(0, 100),
        email,
        passwordHash,
        organizationId: org.id,
      },
    });

    await tx.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: "owner",
      },
    });

    const workspace = await tx.workspace.create({
      data: {
        name: String(workspaceName).substring(0, 100),
        slug: workspaceSlug,
        organizationId: org.id,
      },
    });

    await tx.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: "admin",
      },
    });

    const project = await tx.project.create({
      data: {
        name: String(projectName).substring(0, 100),
        key: sanitizedKey,
        description: `${String(projectName).substring(0, 100)} — managed by Lyght`,
        workspaceId: workspace.id,
      },
    });

    await tx.projectMember.create({
      data: {
        userId: user.id,
        projectId: project.id,
        role: "owner",
      },
    });

    return { organizationId: org.id, workspaceId: workspace.id, projectId: project.id, userId: user.id };
  });

  await setSession(result.userId);

  return NextResponse.json(result);
}
