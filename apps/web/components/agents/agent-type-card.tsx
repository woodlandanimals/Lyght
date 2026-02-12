"use client";

import { StatusLed } from "@/components/ui/status-led";
import type { AgentType } from "@/lib/agents/agent-registry";

interface AgentTypeCardProps {
  agentType: AgentType;
  status: "idle" | "running" | "blocked" | "completed";
  activeRunCount: number;
  tasksCompletedToday: number;
  totalCost: number;
}

const statusToLed: Record<string, string> = {
  idle: "idle",
  running: "running",
  blocked: "blocked",
  completed: "completed",
};

export function AgentTypeCard({
  agentType,
  status,
  activeRunCount,
  tasksCompletedToday,
  totalCost,
}: AgentTypeCardProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-lyght-grey-100/50 transition-colors group">
      {/* Icon */}
      <span className="text-[16px] w-6 text-center shrink-0">{agentType.icon}</span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-mono font-medium text-lyght-black truncate">
            {agentType.name}
          </span>
          <StatusLed status={statusToLed[status] || "idle"} size="sm" />
        </div>
        <div className="text-[11px] font-mono text-lyght-grey-500 mt-0.5">
          {activeRunCount > 0 ? (
            <span className="text-lyght-orange">{activeRunCount} active</span>
          ) : tasksCompletedToday > 0 ? (
            <span>{tasksCompletedToday} tasks</span>
          ) : (
            <span>Idle</span>
          )}
          {totalCost > 0 && (
            <span> · ${totalCost.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
