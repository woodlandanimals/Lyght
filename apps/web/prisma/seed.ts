import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const prisma = new PrismaClient({});

function hashPassword(password: string): string {
  const salt = randomBytes(32).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: "lyght-dev" },
    update: {},
    create: {
      name: "Lyght Dev",
      slug: "lyght-dev",
    },
  });

  console.log("Created organization:", org.name);

  // Create demo user with password
  const user = await prisma.user.upsert({
    where: { email: "demo@lyght.dev" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@lyght.dev",
      passwordHash: hashPassword("password"),
      role: "admin",
      organizationId: org.id,
    },
  });

  console.log("Created user:", user.name, "(password: password)");

  // Create org membership
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: "owner",
    },
  });

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "engineering" } },
    update: {},
    create: {
      name: "Engineering",
      slug: "engineering",
      organizationId: org.id,
    },
  });

  console.log("Created workspace:", workspace.name);

  // Create workspace membership
  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    update: {},
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: "admin",
    },
  });

  // Create demo project
  const project = await prisma.project.upsert({
    where: { key: "LYG" },
    update: {},
    create: {
      name: "Lyght",
      key: "LYG",
      description: "Agentic project management system",
      workspaceId: workspace.id,
      members: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
    },
  });

  console.log("Created project:", project.name);

  // Create sample issues
  const issues = [
    {
      number: 1,
      title: "Set up project scaffold and configuration",
      description: "Initialize the project with the correct tech stack, configure build tools, and set up the development environment.\n\n## Acceptance Criteria\n- Project compiles and runs\n- All dev dependencies installed\n- CI configuration present",
      status: "done",
      priority: "high",
      type: "task",
      tags: "setup,infrastructure",
    },
    {
      number: 2,
      title: "Design and implement user authentication",
      description: "Build a complete authentication system with login, registration, and session management.\n\n## Acceptance Criteria\n- Users can register and log in\n- Sessions persist across page reloads\n- Protected routes redirect unauthenticated users",
      status: "done",
      priority: "high",
      type: "feature",
      tags: "auth,security",
    },
    {
      number: 3,
      title: "Create REST API endpoints for core resources",
      description: "Implement CRUD API routes for the main data models. Include input validation and error handling.\n\n## Acceptance Criteria\n- All CRUD operations work\n- Input validation on all endpoints\n- Proper error responses",
      status: "planning",
      priority: "medium",
      type: "task",
      tags: "api,backend",
    },
    {
      number: 4,
      title: "Build dashboard UI with data visualization",
      description: "Create the main dashboard view with charts, stats, and activity feed.\n\n## Acceptance Criteria\n- Dashboard renders with real data\n- Responsive layout\n- Performance metrics visible",
      status: "triage",
      priority: "medium",
      type: "feature",
      tags: "ui,dashboard",
    },
    {
      number: 5,
      title: "Fix incorrect date formatting in activity log",
      description: "Dates in the activity log show as raw ISO strings instead of human-readable format.\n\n## Steps to Reproduce\n1. Open any issue\n2. Look at activity timeline\n3. Dates show as ISO strings",
      status: "triage",
      priority: "low",
      type: "bug",
      tags: "bug,ui",
    },
  ];

  for (const issue of issues) {
    await prisma.issue.upsert({
      where: {
        projectId_number: {
          projectId: project.id,
          number: issue.number,
        },
      },
      update: {},
      create: {
        ...issue,
        projectId: project.id,
        createdById: user.id,
      },
    });
  }

  console.log("Created 5 sample issues");
  console.log("\nSeed complete!");
  console.log("Login with: demo@lyght.dev / password");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
