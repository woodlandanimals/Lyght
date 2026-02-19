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
  triage:    ["planning"],
  planning:  ["make", "triage"],
  make:      ["review", "planning"],
  review:    ["done", "make"],
  done:      [],
  cancelled: [],
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
          {s === "planning" ? "PLAN" : s.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
