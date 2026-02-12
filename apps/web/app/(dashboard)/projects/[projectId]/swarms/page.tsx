import { prisma } from "@/lib/prisma";
import { StatusLed } from "@/components/ui/status-led";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CreateSwarmButton } from "@/components/swarm/create-swarm-button";

export default async function SwarmsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const swarms = await prisma.swarm.findMany({
    where: { projectId },
    include: {
      issues: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const readyIssues = await prisma.issue.findMany({
    where: { projectId, planStatus: "approved", swarmId: null },
    select: { id: true, number: true, title: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-mono font-bold text-lyght-black">SWARMS</h1>
        <CreateSwarmButton projectId={projectId} readyIssues={readyIssues} />
      </div>

      {swarms.length === 0 ? (
        <div className="border border-lyght-grey-300/20 px-4 py-12 text-center text-lyght-grey-500 text-[13px] font-mono rounded-lg">
          No swarms yet. Create one to group issues for parallel agent execution.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {swarms.map((swarm) => {
            const completed = swarm.issues.filter((i) => i.status === "done").length;
            const total = swarm.issues.length;
            const progress = total > 0 ? (completed / total) * 100 : 0;

            return (
              <Link
                key={swarm.id}
                href={`/projects/${projectId}/swarms/${swarm.id}`}
                className="border border-lyght-grey-300/20 p-4 hover:bg-lyght-grey-300/15 transition-colors block rounded-lg"
              >
                <div className="flex items-center gap-3 mb-2">
                  <StatusLed status={swarm.status} />
                  <span className="text-[14px] font-mono text-lyght-black font-medium">{swarm.name}</span>
                  <Badge>{swarm.status}</Badge>
                  <span className="text-[11px] text-lyght-grey-500 ml-auto font-mono">
                    {completed}/{total} tasks
                  </span>
                </div>
                <p className="text-[12px] text-lyght-grey-500 mb-2 font-mono">{swarm.objective}</p>
                <ProgressBar value={progress} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
