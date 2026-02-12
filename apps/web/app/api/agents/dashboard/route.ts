import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AGENT_REGISTRY, getAgentType } from "@/lib/agents/agent-registry";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Get all issue IDs for this project first (avoids nested relation filter on every query)
  const projectIssues = await prisma.issue.findMany({
    where: { projectId },
    select: { id: true },
  });
  const issueIds = projectIssues.map((i) => i.id);

  const issueFilter = { issueId: { in: issueIds } };

  const includeIssue = {
    issue: {
      select: {
        id: true,
        number: true,
        title: true,
        projectId: true,
        project: { select: { key: true } },
      },
    },
  };

  // Run queries sequentially to avoid SQLite lock contention
  const activeRuns = await prisma.agentRun.findMany({
    where: { status: { in: ["running", "queued"] }, ...issueFilter },
    include: includeIssue,
    orderBy: { createdAt: "desc" },
  });

  const reviewRuns = await prisma.agentRun.findMany({
    where: { status: "waiting_review", ...issueFilter },
    include: includeIssue,
    orderBy: { createdAt: "desc" },
  });

  const reviewItems = await prisma.reviewItem.findMany({
    where: { status: "pending", issueId: { in: issueIds } },
    include: {
      issue: {
        select: {
          id: true,
          number: true,
          title: true,
          projectId: true,
          project: { select: { key: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const completedToday = await prisma.agentRun.findMany({
    where: {
      status: "completed",
      completedAt: { gte: todayStart },
      ...issueFilter,
    },
    include: includeIssue,
    orderBy: { completedAt: "desc" },
  });

  const failedRuns = await prisma.agentRun.findMany({
    where: {
      status: "failed",
      createdAt: { gte: twentyFourHoursAgo },
      acknowledgedAt: null,
      ...issueFilter,
    },
    include: includeIssue,
    orderBy: { createdAt: "desc" },
  });

  const cancelledRuns = await prisma.agentRun.findMany({
    where: {
      status: "cancelled",
      createdAt: { gte: oneHourAgo },
      acknowledgedAt: null,
      ...issueFilter,
    },
    include: includeIssue,
    orderBy: { createdAt: "desc" },
  });

  // Build agent summaries
  const agentSummaries = AGENT_REGISTRY.map((agentType) => {
    const matchingActive = activeRuns.filter(
      (r) => getAgentType(r.model).id === agentType.id
    );
    const matchingCompleted = completedToday.filter(
      (r) => getAgentType(r.model).id === agentType.id
    );
    const matchingBlocked = reviewRuns.filter(
      (r) => getAgentType(r.model).id === agentType.id && r.blockerType
    );

    let status: "idle" | "running" | "blocked" | "completed" = "idle";
    if (matchingBlocked.length > 0) status = "blocked";
    else if (matchingActive.length > 0) status = "running";
    else if (matchingCompleted.length > 0) status = "completed";

    return {
      agentTypeId: agentType.id,
      status,
      activeRunCount: matchingActive.length,
      tasksCompletedToday: matchingCompleted.length,
      totalCost: [...matchingActive, ...matchingCompleted].reduce(
        (sum, r) => sum + r.cost,
        0
      ),
    };
  });

  // Build notifications
  interface Notification {
    id: string;
    type: "failure" | "completed" | "timeout" | "cancelled";
    severity: "urgent" | "info";
    title: string;
    subtitle: string;
    agentTypeId: string;
    sourceRunId: string;
    issueId: string;
    timestamp: string;
  }

  const notifications: Notification[] = [];

  for (const run of failedRuns) {
    notifications.push({
      id: `fail-${run.id}`,
      type: "failure",
      severity: "urgent",
      title: "Agent run failed",
      subtitle: `${run.issue.project.key}-${run.issue.number}: ${run.issue.title}`,
      agentTypeId: getAgentType(run.model).id,
      sourceRunId: run.id,
      issueId: run.issueId,
      timestamp: run.createdAt.toISOString(),
    });
  }

  for (const run of reviewRuns) {
    if (run.createdAt < thirtyMinAgo) {
      notifications.push({
        id: `timeout-${run.id}`,
        type: "timeout",
        severity: "urgent",
        title: "Review waiting 30m+",
        subtitle: `${run.issue.project.key}-${run.issue.number}: ${run.issue.title}`,
        agentTypeId: getAgentType(run.model).id,
        sourceRunId: run.id,
        issueId: run.issueId,
        timestamp: run.createdAt.toISOString(),
      });
    }
  }

  for (const run of completedToday) {
    if (run.completedAt && run.completedAt >= twoHoursAgo && !run.acknowledgedAt) {
      notifications.push({
        id: `done-${run.id}`,
        type: "completed",
        severity: "info",
        title: "Agent completed",
        subtitle: `${run.issue.project.key}-${run.issue.number}: ${run.issue.title}`,
        agentTypeId: getAgentType(run.model).id,
        sourceRunId: run.id,
        issueId: run.issueId,
        timestamp: run.completedAt.toISOString(),
      });
    }
  }

  for (const run of cancelledRuns) {
    notifications.push({
      id: `cancel-${run.id}`,
      type: "cancelled",
      severity: "info",
      title: "Agent cancelled",
      subtitle: `${run.issue.project.key}-${run.issue.number}: ${run.issue.title}`,
      agentTypeId: getAgentType(run.model).id,
      sourceRunId: run.id,
      issueId: run.issueId,
      timestamp: (run.completedAt || run.createdAt).toISOString(),
    });
  }

  notifications.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "urgent" ? -1 : 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const allRuns = [...activeRuns, ...completedToday, ...reviewRuns];
  const totalCostToday = allRuns.reduce((sum, r) => sum + r.cost, 0);

  return NextResponse.json({
    agentSummaries,
    reviewQueue: { waitingRuns: reviewRuns, reviewItems },
    notifications,
    stats: {
      totalActive: activeRuns.length,
      totalReview: reviewRuns.length + reviewItems.length,
      totalCostToday,
    },
  });
}
