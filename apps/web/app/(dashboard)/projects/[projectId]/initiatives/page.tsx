import { prisma } from "@/lib/prisma";
import { StatusLed } from "@/components/ui/status-led";
import { Badge } from "@/components/ui/badge";
import { NewInitiativeButton } from "@/components/initiatives/new-initiative-button";
import { CreateInitiativeModal } from "@/components/initiatives/create-initiative-modal";
import Link from "next/link";

const priorityVariant: Record<
  string,
  "orange" | "red" | "yellow" | "blue" | "default"
> = {
  urgent: "red",
  high: "orange",
  medium: "yellow",
  low: "blue",
  none: "default",
};

export default async function InitiativesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string; priority?: string }>;
}) {
  const { projectId } = await params;
  const filters = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project)
    return <div className="text-lyght-grey-500">Project not found</div>;

  const where: Record<string, unknown> = { projectId };
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;

  const initiatives = await prisma.initiative.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      lead: true,
      issues: { select: { id: true, status: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-mono font-bold text-lyght-black">
          PROJECTS
        </h1>
        <NewInitiativeButton />
      </div>

      {/* Filter bar */}
      <InitiativeFilters projectId={projectId} current={filters} />

      {/* Initiative list */}
      <div>
        {initiatives.length === 0 ? (
          <div className="px-4 py-12 text-center text-lyght-grey-500 text-[13px] font-mono">
            No projects yet. Create one to get started.
          </div>
        ) : (
          initiatives.map((ini, i) => {
            const totalIssues = ini.issues.length;
            const doneIssues = ini.issues.filter(
              (issue) =>
                issue.status === "done" || issue.status === "closed"
            ).length;
            const progressPct =
              totalIssues > 0
                ? Math.round((doneIssues / totalIssues) * 100)
                : 0;

            return (
              <Link
                key={ini.id}
                href={`/projects/${projectId}/initiatives/${ini.id}`}
                className={`
                  flex items-center gap-4 px-3 py-3 rounded-md
                  hover:bg-lyght-grey-300/15 transition-colors
                  ${i < initiatives.length - 1 ? "border-b border-lyght-grey-300/8" : ""}
                `}
              >
                <StatusLed status={ini.status} />
                <span className="text-[11px] text-lyght-grey-500 font-mono w-[70px] shrink-0">
                  {project.key}-P{ini.number}
                </span>
                <span className="text-[14px] text-lyght-black font-mono flex-1 truncate">
                  {ini.title}
                </span>
                <Badge
                  variant={priorityVariant[ini.priority] || "default"}
                >
                  {ini.priority}
                </Badge>
                {totalIssues > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-12 h-1.5 bg-lyght-grey-300/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lyght-orange rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-lyght-grey-500 w-8">
                      {doneIssues}/{totalIssues}
                    </span>
                  </div>
                )}
                {ini.planStatus !== "none" && (
                  <Badge
                    variant={
                      ini.planStatus === "approved" ? "green" : "blue"
                    }
                  >
                    {ini.planStatus}
                  </Badge>
                )}
              </Link>
            );
          })
        )}
      </div>

      <CreateInitiativeModal />
    </div>
  );
}

function InitiativeFilters({
  projectId,
  current,
}: {
  projectId: string;
  current: { status?: string; priority?: string };
}) {
  const statuses = [
    "planned",
    "in_progress",
    "paused",
    "completed",
    "cancelled",
  ];
  const priorities = ["urgent", "high", "medium", "low"];

  return (
    <div className="flex gap-6 mb-4 flex-wrap items-start">
      <FilterGroup
        label="Status"
        options={statuses}
        current={current.status}
        param="status"
        projectId={projectId}
        otherParams={current}
      />
      <FilterGroup
        label="Priority"
        options={priorities}
        current={current.priority}
        param="priority"
        projectId={projectId}
        otherParams={current}
      />
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
    return `/projects/${projectId}/initiatives${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 mr-0.5">
        {label}:
      </span>
      <Link
        href={buildHref()}
        className={`text-[11px] font-mono rounded-full px-2.5 py-0.5 transition-colors ${
          !current
            ? "bg-lyght-orange/10 text-lyght-orange"
            : "text-lyght-grey-500 hover:text-lyght-black hover:bg-lyght-grey-300/20"
        }`}
      >
        All
      </Link>
      {options.map((opt) => (
        <Link
          key={opt}
          href={buildHref(opt)}
          className={`text-[11px] font-mono rounded-full px-2.5 py-0.5 transition-colors ${
            current === opt
              ? "bg-lyght-orange/10 text-lyght-orange"
              : "text-lyght-grey-500 hover:text-lyght-black hover:bg-lyght-grey-300/20"
          }`}
        >
          {opt.replace("_", " ")}
        </Link>
      ))}
    </div>
  );
}
