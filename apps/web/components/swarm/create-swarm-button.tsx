"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ReadyIssue {
  id: string;
  number: number;
  title: string;
}

export function CreateSwarmButton({ projectId, readyIssues }: { projectId: string; readyIssues: ReadyIssue[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/swarms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, objective, projectId, issueIds: selectedIds }),
      });
      const data = await res.json();
      if (data.id) {
        setOpen(false);
        router.push(`/projects/${projectId}/swarms/${data.id}`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleIssue(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ NEW SWARM</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="CREATE SWARM">
        <div className="flex flex-col gap-4">
          <Input label="Swarm Name" placeholder="Auth System Build" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea label="Objective" placeholder="What this swarm will accomplish..." value={objective} onChange={(e) => setObjective(e.target.value)} />

          {readyIssues.length > 0 && (
            <div>
              <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono block mb-2">
                SELECT ISSUES ({readyIssues.length} ready)
              </span>
              <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                {readyIssues.map((issue) => (
                  <button
                    key={issue.id}
                    onClick={() => toggleIssue(issue.id)}
                    className={`text-left px-3 py-2 text-[13px] font-mono transition-colors cursor-pointer rounded-md ${
                      selectedIds.includes(issue.id)
                        ? "bg-lyght-orange/10 text-lyght-orange border border-lyght-orange/30"
                        : "text-lyght-grey-500 border border-lyght-grey-300/10 hover:bg-lyght-grey-300/15"
                    }`}
                  >
                    #{issue.number} {issue.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>CANCEL</Button>
            <Button onClick={handleCreate} loading={loading} disabled={!name.trim() || !objective.trim()}>
              CREATE SWARM
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
