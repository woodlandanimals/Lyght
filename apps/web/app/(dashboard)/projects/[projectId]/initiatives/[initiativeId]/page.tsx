import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { InitiativeActions } from "@/components/initiatives/initiative-actions";
import { InitiativeProperties } from "@/components/initiatives/initiative-properties";
import { PlanningChat } from "@/components/planning/planning-chat";
import { ChildIssuesList } from "@/components/initiatives/child-issues-list";

export default async function InitiativeDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; initiativeId: string }>;
}) {
  const { projectId, initiativeId } = await params;

  const initiative = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    include: {
      project: true,
      lead: true,
      createdBy: true,
      issues: {
        include: { assignee: true },
        orderBy: { createdAt: "asc" },
      },
      planningMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!initiative)
    return <div className="text-lyght-grey-500">Project not found</div>;

  // Serialize planning messages for client
  const serializedMessages = initiative.planningMessages.map((m) => ({
    id: m.id,
    role: m.role,
    type: m.type,
    content: m.content,
    metadata: m.metadata,
    createdAt: m.createdAt.toISOString(),
  }));

  // Calculate progress
  const issueCount = initiative.issues.length;
  const doneCount = initiative.issues.filter(
    (i) => i.status === "done"
  ).length;

  return (
    <div className="flex gap-0 max-w-6xl">
      {/* Main content */}
      <div className="flex-1 min-w-0 pr-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-[11px] text-lyght-grey-500 font-mono">
          <Link
            href={`/projects/${projectId}/initiatives`}
            className="hover:text-lyght-black"
          >
            PROJECTS
          </Link>
          <span>/</span>
          <span className="text-lyght-black">
            {initiative.project.key}-P{initiative.number}
          </span>
        </div>

        {/* Header */}
        <h1 className="text-[22px] font-mono font-bold text-lyght-black leading-tight mb-4">
          {initiative.title}
        </h1>

        {/* Actions */}
        <InitiativeActions initiative={initiative} />

        {/* Description */}
        <div className="mb-6">
          <div className="text-[14px] text-lyght-grey-700 font-sans leading-relaxed whitespace-pre-wrap">
            {initiative.description || (
              <span className="text-lyght-grey-500 italic">
                Add description...
              </span>
            )}
          </div>
        </div>

        {/* Planning Chat */}
        <PlanningChat
          entityId={initiative.id}
          entityType="initiative"
          projectId={projectId}
          initialMessages={serializedMessages}
          entityStatus={initiative.status}
          planStatus={initiative.planStatus}
        />

        {/* Child Issues */}
        {initiative.issues.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">
                Issues ({initiative.issues.length})
              </h2>
            </div>
            <div className="border border-lyght-grey-300/20 rounded-lg overflow-hidden">
              <ChildIssuesList
                issues={initiative.issues.map((i) => ({
                  id: i.id,
                  number: i.number,
                  title: i.title,
                  status: i.status,
                  priority: i.priority,
                  type: i.type,
                  planStatus: i.planStatus,
                }))}
                projectId={projectId}
                projectKey={initiative.project.key}
              />
            </div>
          </div>
        )}
      </div>

      {/* Properties sidebar */}
      <div className="border-l border-lyght-grey-300/20 pl-8">
        <InitiativeProperties
          initiativeId={initiative.id}
          status={initiative.status}
          priority={initiative.priority}
          planStatus={initiative.planStatus}
          leadName={initiative.lead?.name}
          issueCount={issueCount}
          doneCount={doneCount}
          createdAt={initiative.createdAt.toISOString()}
          updatedAt={initiative.updatedAt.toISOString()}
        />
      </div>
    </div>
  );
}
