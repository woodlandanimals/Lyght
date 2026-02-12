"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAgentType } from "@/lib/agents/agent-registry";
import Link from "next/link";

interface AgentRun {
  id: string;
  status: string;
  model: string;
  blockerType: string | null;
  blockerMessage: string | null;
  output: string | null;
  issue: {
    id: string;
    number: number;
    title: string;
    projectId: string;
    project: { key: string };
  };
}

interface ReviewCardProps {
  run: AgentRun;
  onAction: () => void;
}

const agentColorMap: Record<string, string> = {
  "lyght-orange": "border-l-lyght-orange",
  "lyght-blue": "border-l-lyght-blue",
  "lyght-yellow": "border-l-lyght-yellow",
  "lyght-green": "border-l-lyght-green",
};

export function ReviewCard({ run, onAction }: ReviewCardProps) {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const agent = getAgentType(run.model);
  const borderColor = agentColorMap[agent.color] || "border-l-lyght-orange";

  async function respond() {
    if (!response.trim()) return;
    setLoading("respond");
    await fetch(`/api/agents/${run.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response }),
    });
    setResponse("");
    setLoading(null);
    onAction();
  }

  async function approve() {
    setLoading("approve");
    await fetch(`/api/agents/${run.id}/approve`, { method: "POST" });
    setLoading(null);
    onAction();
  }

  async function cancel() {
    setLoading("cancel");
    await fetch(`/api/agents/${run.id}/cancel`, { method: "POST" });
    setLoading(null);
    onAction();
  }

  return (
    <div className={`border border-lyght-grey-300/20 border-l-2 ${borderColor} rounded-lg p-4`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px]">{agent.icon}</span>
        <Badge>{agent.name}</Badge>
        <Link
          href={`/projects/${run.issue.projectId}/issues/${run.issue.id}`}
          className="text-[11px] text-lyght-grey-500 font-mono hover:text-lyght-orange transition-colors"
        >
          {run.issue.project.key}-{run.issue.number}
        </Link>
        <span className="text-[12px] text-lyght-grey-500 font-mono truncate flex-1">
          {run.issue.title}
        </span>
      </div>

      {/* Body */}
      <p className="text-[13px] text-lyght-black font-mono mb-3">
        {run.blockerMessage || "Agent output ready for review"}
      </p>

      {/* Actions */}
      {run.blockerType === "question" ? (
        <div className="flex gap-2">
          <input
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && respond()}
            placeholder="Type response..."
            className="flex-1 bg-transparent border border-lyght-grey-300/30 rounded-md text-lyght-black font-mono text-[13px] py-1.5 px-3 outline-none focus:border-lyght-orange/40 transition-colors"
          />
          <Button size="sm" onClick={respond} loading={loading === "respond"}>
            SEND
          </Button>
          <Button size="sm" variant="ghost" onClick={cancel} loading={loading === "cancel"}>
            SKIP
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" onClick={approve} loading={loading === "approve"}>
            APPROVE
          </Button>
          <Button size="sm" variant="secondary" onClick={cancel} loading={loading === "cancel"}>
            REJECT
          </Button>
          <Link href={`/projects/${run.issue.projectId}/issues/${run.issue.id}`}>
            <Button size="sm" variant="ghost">
              VIEW ISSUE
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
