import { prisma } from "@/lib/prisma";
import { StatusLed } from "@/components/ui/status-led";
import { Badge } from "@/components/ui/badge";
import { NewIssueButton } from "@/components/issues/new-issue-button";
import Link from "next/link";

const priorityVariant: Record<string, "orange" | "red" | "yellow" | "blue" | "default"> = {
  urgent: "red",
  high: "orange",
  medium: "yellow",
  low: "blue",
  none: "default",
};

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

  const issues = await prisma.issue.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { assignee: true },
  });

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
      <div>
        {issues.length === 0 ? (
          <div className="px-4 py-12 text-center text-lyght-grey-500 text-[13px] font-mono">
            No issues yet. Create one to get started.
          </div>
        ) : (
          issues.map((issue, i) => (
            <Link
              key={issue.id}
              href={`/projects/${projectId}/issues/${issue.id}`}
              className={`
                flex items-center gap-4 px-3 py-2.5 rounded-md
                hover:bg-lyght-grey-300/15 transition-colors
                ${i < issues.length - 1 ? "border-b border-lyght-grey-300/8" : ""}
              `}
            >
              <StatusLed status={issue.status} />
              <span className="text-[11px] text-lyght-grey-500 font-mono w-[60px] shrink-0">
                {project.key}-{issue.number}
              </span>
              <span className="text-[14px] text-lyght-black font-mono flex-1 truncate">
                {issue.title}
              </span>
              <Badge variant={priorityVariant[issue.priority] || "default"}>
                {issue.priority}
              </Badge>
              <Badge>{issue.type}</Badge>
              {issue.planStatus !== "none" && (
                <Badge variant={issue.planStatus === "approved" ? "green" : "blue"}>
                  {issue.planStatus}
                </Badge>
              )}
            </Link>
          ))
        )}
      </div>
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
  const statuses = ["triage", "planning", "planned", "ready", "in_progress", "in_review", "done"];
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
