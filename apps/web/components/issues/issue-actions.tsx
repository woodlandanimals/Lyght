"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Issue {
  id: string;
  status: string;
  planStatus: string;
  aiPlan: string | null;
}

const statusFlow: Record<string, string[]> = {
  triage: ["planning"],
  planning: ["triage"],
  planned: ["ready", "planning"],
  ready: ["in_progress", "planning"],
  in_progress: ["in_review", "ready"],
  in_review: ["done", "in_progress"],
  done: ["closed"],
};

export function IssueActions({ issue, projectId }: { issue: Issue; projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function changeStatus(newStatus: string) {
    setLoading(newStatus);
    try {
      await fetch(`/api/issues/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const nextStatuses = statusFlow[issue.status] || [];

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {nextStatuses.map((s) => (
        <Button
          key={s}
          variant="secondary"
          size="sm"
          onClick={() => changeStatus(s)}
          loading={loading === s}
        >
          {s === "planning" ? "PLAN" : s.replace("_", " ").toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
