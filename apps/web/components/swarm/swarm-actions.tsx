"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SwarmActions({ swarmId, status }: { swarmId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function startSwarm() {
    setLoading("start");
    try {
      await fetch(`/api/swarms/${swarmId}/start`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function updateStatus(newStatus: string) {
    setLoading(newStatus);
    try {
      await fetch(`/api/swarms/${swarmId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      {(status === "forming" || status === "paused") && (
        <Button onClick={startSwarm} loading={loading === "start"}>
          START SWARM
        </Button>
      )}
      {status === "active" && (
        <Button variant="secondary" onClick={() => updateStatus("paused")} loading={loading === "paused"}>
          PAUSE
        </Button>
      )}
      {status !== "completed" && (
        <Button variant="ghost" onClick={() => updateStatus("completed")} loading={loading === "completed"}>
          MARK COMPLETE
        </Button>
      )}
    </div>
  );
}
