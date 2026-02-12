import { prisma } from "@/lib/prisma";
import { AgentDashboard } from "@/components/agents/agent-dashboard";

export default async function AgentDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return <div className="text-lyght-grey-500">Project not found</div>;

  return (
    <AgentDashboard
      projectId={projectId}
      projectKey={project.key}
    />
  );
}
