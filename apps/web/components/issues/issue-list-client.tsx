"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusLed } from "@/components/ui/status-led";
import { Badge } from "@/components/ui/badge";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Issue {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  type: string;
  planStatus: string;
  assignee: { id: string; name: string } | null;
}

interface IssueListClientProps {
  issues: Issue[];
  projectId: string;
  projectKey: string;
  members: Member[];
}

const priorityVariant: Record<string, "orange" | "red" | "yellow" | "blue" | "default"> = {
  urgent: "red",
  high: "orange",
  medium: "yellow",
  low: "blue",
  none: "default",
};

export function IssueListClient({ issues, projectId, projectKey, members }: IssueListClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === issues.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(issues.map((i) => i.id)));
    }
  }

  async function bulkAssign(userId: string) {
    await fetch("/api/issues/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], assigneeId: userId || null }),
    });
    startTransition(() => { router.refresh(); });
    setSelected(new Set());
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} issue${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    await fetch("/api/issues/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    startTransition(() => { router.refresh(); });
    setSelected(new Set());
  }

  const allSelected = issues.length > 0 && selected.size === issues.length;
  const someSelected = selected.size > 0;

  return (
    <div>
      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-lyght-orange/5 border border-lyght-orange/20 rounded-lg">
          <span className="text-[12px] font-mono text-lyght-orange">
            {selected.size} selected
          </span>
          <div className="w-px h-4 bg-lyght-grey-300/40" />

          {/* Assign to */}
          <div className="relative group">
            <button className="text-[12px] font-mono text-lyght-grey-500 hover:text-lyght-black transition-colors flex items-center gap-1">
              Assign to
              <span className="text-[10px]">▾</span>
            </button>
            <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-lyght-grey-300/30 rounded-lg shadow-lg z-20 hidden group-hover:block">
              <div className="py-1">
                <button
                  onClick={() => bulkAssign("")}
                  className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-lyght-grey-500 hover:bg-lyght-grey-100 transition-colors"
                >
                  Unassigned
                </button>
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => bulkAssign(m.id)}
                    className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-lyght-black hover:bg-lyght-grey-100 transition-colors"
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Create sub-issues — navigates to new issue form with parent pre-selected */}
          {selected.size === 1 && (
            <Link
              href={`/projects/${projectId}/issues/new?parentId=${[...selected][0]}`}
              className="text-[12px] font-mono text-lyght-grey-500 hover:text-lyght-black transition-colors"
            >
              Create sub-issue
            </Link>
          )}

          <div className="flex-1" />

          {/* Delete */}
          <button
            onClick={bulkDelete}
            disabled={isPending}
            className="text-[12px] font-mono text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            Delete {selected.size > 1 ? `${selected.size} issues` : "issue"}
          </button>

          {/* Clear */}
          <button
            onClick={() => setSelected(new Set())}
            className="text-[12px] font-mono text-lyght-grey-500 hover:text-lyght-black transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* List */}
      {issues.length === 0 ? (
        <div className="px-4 py-12 text-center text-lyght-grey-500 text-[13px] font-mono">
          No issues yet. Create one to get started.
        </div>
      ) : (
        <div>
          {/* Select-all row */}
          {issues.length > 1 && (
            <div className="flex items-center gap-4 px-3 py-1.5">
              <Checkbox
                checked={allSelected}
                indeterminate={!allSelected && someSelected}
                onChange={toggleAll}
              />
              <span className="text-[11px] text-lyght-grey-500 font-mono">
                {allSelected ? "Deselect all" : "Select all"}
              </span>
            </div>
          )}

          {issues.map((issue, i) => {
            const isSelected = selected.has(issue.id);
            const isHovered = hoveredId === issue.id;
            const showCheck = isSelected || isHovered || someSelected;

            return (
              <div
                key={issue.id}
                className={`
                  group flex items-center gap-4 px-3 py-2.5 rounded-md transition-colors
                  ${isSelected ? "bg-lyght-orange/5" : "hover:bg-lyght-grey-300/15"}
                  ${i < issues.length - 1 ? "border-b border-lyght-grey-300/8" : ""}
                `}
                onMouseEnter={() => setHoveredId(issue.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Checkbox / Status LED */}
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                  {showCheck ? (
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggle(issue.id)}
                    />
                  ) : (
                    <StatusLed status={issue.status} />
                  )}
                </div>

                {/* Rest of the row — clicking navigates */}
                <Link
                  href={`/projects/${projectId}/issues/${issue.id}`}
                  className="flex items-center gap-4 flex-1 min-w-0"
                  onClick={(e) => { if (isSelected) e.preventDefault(); }}
                >
                  <span className="text-[11px] text-lyght-grey-500 font-mono w-[60px] shrink-0">
                    {projectKey}-{issue.number}
                  </span>
                  <span className="text-[14px] text-lyght-black font-mono flex-1 truncate">
                    {issue.title}
                  </span>
                  {issue.assignee && (
                    <span className="text-[11px] font-mono text-lyght-grey-500 shrink-0 hidden sm:block">
                      {issue.assignee.name}
                    </span>
                  )}
                  <Badge variant={priorityVariant[issue.priority] || "default"}>
                    {issue.priority}
                  </Badge>
                  <Badge>{issue.type}</Badge>
                  {issue.planStatus !== "none" && (
                    <Badge
                      variant={
                        issue.planStatus === "approved"
                          ? "green"
                          : issue.planStatus === "generating"
                            ? "orange"
                            : "blue"
                      }
                    >
                      {issue.planStatus === "generating" && (
                        <span className="inline-block w-2.5 h-2.5 border-[1.5px] border-lyght-orange border-t-transparent rounded-full animate-spin mr-1" />
                      )}
                      {issue.planStatus}
                    </Badge>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(); }}
      className={`
        w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors
        ${checked || indeterminate
          ? "bg-lyght-orange border-lyght-orange"
          : "border-lyght-grey-300/60 hover:border-lyght-orange/60"
        }
      `}
    >
      {checked && (
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {indeterminate && !checked && (
        <span className="w-2 h-0.5 bg-white rounded-full" />
      )}
    </button>
  );
}
