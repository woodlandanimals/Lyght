import { ISSUE_STATUSES } from "@/lib/statuses";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NewIssueButton } from "@/components/issues/new-issue-button";
import { IssueListClient } from "@/components/issues/issue-list-client";
import Link from "next/link";

export default async function IssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; priority?: string; type?: string }>;
}) {
  const { projectId } = await params;
  const filters = await searchParams;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return <div className="text-lyght-grey-500">Project not found</div>;

  const where: Record<string, unknown> = { projectId };
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.type) where.type = filters.type;

  const [issues, user] = await Promise.all([
    prisma.issue.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        priority: true,
        type: true,
        planStatus: true,
        assignee: { select: { id: true, name: true } },
      },
    }),
    getCurrentUser(),
  ]);

  // Fetch org members for assignment
  const orgId = user?.organizationMemberships?.[0]?.organizationId;
  const members = orgId
    ? await prisma.user.findMany({
        where: { organizationMemberships: { some: { organizationId: orgId } } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-mono font-bold text-lyght-black">
          ISSUES
        </h1>
        <NewIssueButton />
      </div>

      {/* Filter bar */}
      <IssueFilters projectId={projectId} current={filters} />

      {/* Issue list */}
      <IssueListClient
        issues={issues}
        projectId={projectId}
        projectKey={project.key}
        members={members}
      />
    </div>
  );
}

function IssueFilters({
  projectId,
  current,
}: {
  projectId: string;
  current: { status?: string; priority?: string; type?: string };
}) {
  const statuses = ISSUE_STATUSES.map((s) => s.id);
  const priorities = ["urgent", "high", "medium", "low"];
  const types = ["task", "bug", "feature", "epic"];

  return (
    <div className="flex gap-6 mb-4 flex-wrap items-start">
      <FilterGroup label="Status" options={statuses} current={current.status} param="status" projectId={projectId} otherParams={current} />
      <FilterGroup label="Priority" options={priorities} current={current.priority} param="priority" projectId={projectId} otherParams={current} />
      <FilterGroup label="Type" options={types} current={current.type} param="type" projectId={projectId} otherParams={current} />
    </div>
  );
}

function FilterGroup({
  label,
  options,
  current,
  param,
  projectId,
  otherParams,
}: {
  label: string;
  options: string[];
  current?: string;
  param: string;
  projectId: string;
  otherParams: Record<string, string | undefined>;
}) {
  function buildHref(value?: string) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(otherParams)) {
      if (v && k !== param) p.set(k, v);
    }
    if (value) p.set(param, value);
    const qs = p.toString();
    return `/projects/${projectId}/issues${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 mr-0.5">{label}:</span>
      <Link
        href={buildHref()}
        className={`text-[11px] font-mono rounded-full px-2.5 py-0.5 transition-colors ${!current ? "bg-lyght-orange/10 text-lyght-orange" : "text-lyght-grey-500 hover:text-lyght-black hover:bg-lyght-grey-300/20"}`}
      >
        All
      </Link>
      {options.map((opt) => (
        <Link
          key={opt}
          href={buildHref(opt)}
          className={`text-[11px] font-mono rounded-full px-2.5 py-0.5 transition-colors ${current === opt ? "bg-lyght-orange/10 text-lyght-orange" : "text-lyght-grey-500 hover:text-lyght-black hover:bg-lyght-grey-300/20"}`}
        >
          {opt.replace("_", " ")}
        </Link>
      ))}
    </div>
  );
}
