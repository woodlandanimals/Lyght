"use client";

import { AgentTypeCard } from "./agent-type-card";
import { AGENT_REGISTRY } from "@/lib/agents/agent-registry";

interface AgentSummary {
  agentTypeId: string;
  status: "idle" | "running" | "blocked" | "completed";
  activeRunCount: number;
  tasksCompletedToday: number;
  totalCost: number;
}

interface AgentStatusPanelProps {
  agentSummaries: AgentSummary[];
}

export function AgentStatusPanel({ agentSummaries }: AgentStatusPanelProps) {
  const totalTasks = agentSummaries.reduce(
    (sum, s) => sum + s.tasksCompletedToday,
    0
  );
  const totalCost = agentSummaries.reduce((sum, s) => sum + s.totalCost, 0);

  return (
    <div className="border-r border-lyght-grey-300/20 pr-0 overflow-y-auto flex flex-col">
      {/* Section label */}
      <div className="px-4 pt-1 pb-3">
        <h2 className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">
          Agents
        </h2>
      </div>

      {/* Agent list */}
      <div className="flex flex-col gap-0.5 px-1 flex-1">
        {AGENT_REGISTRY.map((agentType) => {
          const summary = agentSummaries.find(
            (s) => s.agentTypeId === agentType.id
          );
          return (
            <AgentTypeCard
              key={agentType.id}
              agentType={agentType}
              status={summary?.status || "idle"}
              activeRunCount={summary?.activeRunCount || 0}
              tasksCompletedToday={summary?.tasksCompletedToday || 0}
              totalCost={summary?.totalCost || 0}
            />
          );
        })}
      </div>

      {/* Divider + stats */}
      <div className="border-t border-lyght-grey-300/15 mx-4 mt-4 pt-4 pb-2">
        <div className="text-[11px] font-mono text-lyght-grey-500 space-y-1 px-0">
          <div className="flex justify-between">
            <span>Tasks today</span>
            <span className="text-lyght-black">{totalTasks}</span>
          </div>
          <div className="flex justify-between">
            <span>Cost today</span>
            <span className="text-lyght-green">${totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
