"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusLed } from "@/components/ui/status-led";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Issue {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  type: string;
  planStatus: string;
}

interface Column {
  id: string;
  label: string;
  issues: Issue[];
}

export function BoardView({
  columns,
  projectKey,
  projectId,
}: {
  columns: Column[];
  projectKey: string;
  projectId: string;
}) {
  const router = useRouter();
  const [draggedIssue, setDraggedIssue] = useState<string | null>(null);

  async function moveIssue(issueId: string, newStatus: string) {
    await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div
          key={col.id}
          className="w-[220px] shrink-0 flex flex-col rounded-lg bg-lyght-grey-100/30"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedIssue) {
              moveIssue(draggedIssue, col.id);
              setDraggedIssue(null);
            }
          }}
        >
          <div className="flex items-center gap-2 mb-3 px-2 rounded-lg">
            <StatusLed status={col.id} size="sm" />
            <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">
              {col.label}
            </span>
            <span className="text-[11px] text-lyght-grey-500 font-mono ml-auto">
              {col.issues.length}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {col.issues.map((issue) => (
              <Link
                key={issue.id}
                href={`/projects/${projectId}/issues/${issue.id}`}
                draggable
                onDragStart={() => setDraggedIssue(issue.id)}
                className={`block border border-lyght-grey-300/20 bg-white p-3 hover:bg-lyght-grey-300/15 transition-colors cursor-grab active:cursor-grabbing rounded-lg hover:shadow-md transition-shadow ${draggedIssue === issue.id ? "shadow-lg" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <StatusLed status={issue.status} size="sm" />
                  <span className="text-[11px] text-lyght-grey-500 font-mono">
                    {projectKey}-{issue.number}
                  </span>
                </div>
                <div className="text-[13px] text-lyght-black font-mono leading-tight mb-2">
                  {issue.title}
                </div>
                <div className="flex items-center gap-1">
                  <Badge>{issue.priority}</Badge>
                  {issue.planStatus !== "none" && (
                    <Badge variant={issue.planStatus === "approved" ? "green" : "blue"}>
                      {issue.planStatus}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
