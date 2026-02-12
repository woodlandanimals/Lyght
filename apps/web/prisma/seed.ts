import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({});

async function main() {
  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@lyght.dev" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@lyght.dev",
      role: "admin",
    },
  });

  console.log("Created user:", user.name);

  // Create demo project
  const project = await prisma.project.upsert({
    where: { key: "LYG" },
    update: {},
    create: {
      name: "Lyght",
      key: "LYG",
      description: "Agentic project management system",
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
      status: "in_progress",
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
  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
