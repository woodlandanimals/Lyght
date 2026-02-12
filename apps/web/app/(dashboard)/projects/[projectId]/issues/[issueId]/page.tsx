import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { IssueActions } from "@/components/issues/issue-actions";
import { IssueProperties } from "@/components/issues/issue-properties";
import { PlanningChat } from "@/components/planning/planning-chat";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; issueId: string }>;
}) {
  const { projectId, issueId } = await params;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      project: true,
      assignee: true,
      createdBy: true,
      planningMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!issue) return <div className="text-lyght-grey-500">Issue not found</div>;

  // Serialize planning messages for client
  const serializedMessages = issue.planningMessages.map((m) => ({
    id: m.id,
    role: m.role,
    type: m.type,
    content: m.content,
    metadata: m.metadata,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="flex gap-0 max-w-6xl">
      {/* Main content */}
      <div className="flex-1 min-w-0 pr-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-[11px] text-lyght-grey-500 font-mono">
          <Link href={`/projects/${projectId}/issues`} className="hover:text-lyght-black">ISSUES</Link>
          <span>/</span>
          <span className="text-lyght-black">{issue.project.key}-{issue.number}</span>
        </div>

        {/* Header */}
        <h1 className="text-[22px] font-mono font-bold text-lyght-black leading-tight mb-4">
          {issue.title}
        </h1>

        {/* Actions */}
        <IssueActions issue={issue} projectId={projectId} />

        {/* Description */}
        <div className="mb-6">
          <div className="text-[14px] text-lyght-grey-700 font-sans leading-relaxed whitespace-pre-wrap">
            {issue.description || <span className="text-lyght-grey-500 italic">Add description...</span>}
          </div>
        </div>

        {/* Planning Chat — replaces AI Plan, Agent Output, and Activity Timeline */}
        <PlanningChat
          entityId={issue.id}
          entityType="issue"
          projectId={projectId}
          initialMessages={serializedMessages}
          entityStatus={issue.status}
          planStatus={issue.planStatus}
        />
      </div>

      {/* Properties sidebar */}
      <div className="border-l border-lyght-grey-300/20 pl-8">
        <IssueProperties
          issueId={issue.id}
          projectId={projectId}
          status={issue.status}
          priority={issue.priority}
          type={issue.type}
          planStatus={issue.planStatus}
          assigneeName={issue.assignee?.name}
          createdAt={issue.createdAt.toISOString()}
          updatedAt={issue.updatedAt.toISOString()}
        />
      </div>
    </div>
  );
}
