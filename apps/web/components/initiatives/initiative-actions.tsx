"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Initiative {
  id: string;
  status: string;
  planStatus: string;
}

const statusFlow: Record<string, string[]> = {
  planned: ["in_progress", "cancelled"],
  in_progress: ["paused", "completed", "cancelled"],
  paused: ["in_progress", "cancelled"],
  completed: [],
  cancelled: ["planned"],
};

export function InitiativeActions({ initiative }: { initiative: Initiative }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function changeStatus(newStatus: string) {
    setLoading(newStatus);
    try {
      await fetch(`/api/initiatives/${initiative.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const nextStatuses = statusFlow[initiative.status] || [];

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
          {s.replace("_", " ").toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
