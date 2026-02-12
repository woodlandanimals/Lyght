import { prisma } from "@/lib/prisma";
import { StatusLed } from "@/components/ui/status-led";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SwarmActions } from "@/components/swarm/swarm-actions";
import Link from "next/link";

export default async function SwarmDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; swarmId: string }>;
}) {
  const { projectId, swarmId } = await params;

  const swarm = await prisma.swarm.findUnique({
    where: { id: swarmId },
    include: {
      project: true,
      issues: {
        include: {
          agentRuns: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      agentRuns: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!swarm) return <div className="text-lyght-grey-500">Swarm not found</div>;

  const completed = swarm.issues.filter((i) => i.status === "done").length;
  const progress = swarm.issues.length > 0 ? (completed / swarm.issues.length) * 100 : 0;
  const totalCost = swarm.agentRuns.reduce((sum, r) => sum + r.cost, 0);
  const totalTokens = swarm.agentRuns.reduce((sum, r) => sum + r.tokensUsed, 0);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <StatusLed status={swarm.status} size="lg" />
        <h1 className="text-[20px] font-mono font-bold text-lyght-black">{swarm.name}</h1>
        <Badge>{swarm.status}</Badge>
      </div>

      <p className="text-[13px] text-lyght-grey-500 mb-4 font-mono">{swarm.objective}</p>

      <div className="flex gap-6 mb-6 text-[11px] font-mono text-lyght-grey-500 uppercase tracking-[0.1em]">
        <span>{swarm.issues.length} TASKS</span>
        <span>{completed} COMPLETED</span>
        <span>{totalTokens.toLocaleString()} TOKENS</span>
        <span>${totalCost.toFixed(4)} COST</span>
      </div>

      <ProgressBar value={progress} className="mb-6" />

      <SwarmActions swarmId={swarmId} status={swarm.status} />

      {/* Issue list */}
      <div className="border border-lyght-grey-300/20 mt-6 rounded-lg">
        <div className="px-4 py-2 border-b border-lyght-grey-300/10">
          <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">ISSUES</span>
        </div>
        {swarm.issues.map((issue, i) => {
          const latestRun = issue.agentRuns[0];
          return (
            <Link
              key={issue.id}
              href={`/projects/${projectId}/issues/${issue.id}`}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-lyght-grey-300/15 transition-colors ${
                i < swarm.issues.length - 1 ? "border-b border-lyght-grey-300/10" : ""
              }`}
            >
              <StatusLed status={issue.status} />
              <span className="text-[11px] text-lyght-grey-500 font-mono">
                {swarm.project.key}-{issue.number}
              </span>
              <span className="text-[14px] text-lyght-black font-mono flex-1 truncate">{issue.title}</span>
              <Badge>{issue.status.replace("_", " ")}</Badge>
              {latestRun && (
                <span className="text-[11px] text-lyght-grey-500 font-mono">
                  {latestRun.status} | ${latestRun.cost.toFixed(4)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
