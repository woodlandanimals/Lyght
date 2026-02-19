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

interface Initiative {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  planStatus: string;
  lead: { id: string; name: string } | null;
  issues: { id: string; status: string }[];
}

interface InitiativeListClientProps {
  initiatives: Initiative[];
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

export function InitiativeListClient({
  initiatives,
  projectId,
  projectKey,
  members,
}: InitiativeListClientProps) {
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
    if (selected.size === initiatives.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(initiatives.map((i) => i.id)));
    }
  }

  async function bulkAssignLead(userId: string) {
    await fetch("/api/initiatives/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], leadId: userId || null }),
    });
    startTransition(() => { router.refresh(); });
    setSelected(new Set());
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} project${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    await fetch("/api/initiatives/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    startTransition(() => { router.refresh(); });
    setSelected(new Set());
  }

  const allSelected = initiatives.length > 0 && selected.size === initiatives.length;
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

          {/* Assign lead */}
          <div className="relative group">
            <button className="text-[12px] font-mono text-lyght-grey-500 hover:text-lyght-black transition-colors flex items-center gap-1">
              Assign lead
              <span className="text-[10px]">▾</span>
            </button>
            <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-lyght-grey-300/30 rounded-lg shadow-lg z-20 hidden group-hover:block">
              <div className="py-1">
                <button
                  onClick={() => bulkAssignLead("")}
                  className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-lyght-grey-500 hover:bg-lyght-grey-100 transition-colors"
                >
                  Unassigned
                </button>
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => bulkAssignLead(m.id)}
                    className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-lyght-black hover:bg-lyght-grey-100 transition-colors"
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Create sub-issue for a single selected initiative */}
          {selected.size === 1 && (
            <Link
              href={`/projects/${projectId}/issues/new?initiativeId=${[...selected][0]}`}
              className="text-[12px] font-mono text-lyght-grey-500 hover:text-lyght-black transition-colors"
            >
              Create issue
            </Link>
          )}

          <div className="flex-1" />

          {/* Delete */}
          <button
            onClick={bulkDelete}
            disabled={isPending}
            className="text-[12px] font-mono text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            Delete {selected.size > 1 ? `${selected.size} projects` : "project"}
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
      {initiatives.length === 0 ? (
        <div className="px-4 py-12 text-center text-lyght-grey-500 text-[13px] font-mono">
          No projects yet. Create one to get started.
        </div>
      ) : (
        <div>
          {/* Select-all row */}
          {initiatives.length > 1 && (
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

          {initiatives.map((ini, i) => {
            const isSelected = selected.has(ini.id);
            const isHovered = hoveredId === ini.id;
            const showCheck = isSelected || isHovered || someSelected;

            const totalIssues = ini.issues.length;
            const doneIssues = ini.issues.filter((issue) => issue.status === "done").length;
            const progressPct = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

            return (
              <div
                key={ini.id}
                className={`
                  group flex items-center gap-4 px-3 py-3 rounded-md transition-colors
                  ${isSelected ? "bg-lyght-orange/5" : "hover:bg-lyght-grey-300/15"}
                  ${i < initiatives.length - 1 ? "border-b border-lyght-grey-300/8" : ""}
                `}
                onMouseEnter={() => setHoveredId(ini.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Checkbox / Status LED */}
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                  {showCheck ? (
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggle(ini.id)}
                    />
                  ) : (
                    <StatusLed status={ini.status} />
                  )}
                </div>

                {/* Row content — clicking navigates */}
                <Link
                  href={`/projects/${projectId}/initiatives/${ini.id}`}
                  className="flex items-center gap-4 flex-1 min-w-0"
                  onClick={(e) => { if (isSelected) e.preventDefault(); }}
                >
                  <span className="text-[11px] text-lyght-grey-500 font-mono w-[70px] shrink-0">
                    {projectKey}-P{ini.number}
                  </span>
                  <span className="text-[14px] text-lyght-black font-mono flex-1 truncate">
                    {ini.title}
                  </span>
                  {ini.lead && (
                    <span className="text-[11px] font-mono text-lyght-grey-500 shrink-0 hidden sm:block">
                      {ini.lead.name}
                    </span>
                  )}
                  <Badge variant={priorityVariant[ini.priority] || "default"}>
                    {ini.priority}
                  </Badge>
                  {totalIssues > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-12 h-1.5 bg-lyght-grey-300/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-lyght-orange rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-lyght-grey-500 w-8">
                        {doneIssues}/{totalIssues}
                      </span>
                    </div>
                  )}
                  {ini.planStatus !== "none" && (
                    <Badge
                      variant={
                        ini.planStatus === "approved"
                          ? "green"
                          : ini.planStatus === "generating"
                            ? "orange"
                            : "blue"
                      }
                    >
                      {ini.planStatus === "generating" && (
                        <span className="inline-block w-2.5 h-2.5 border-[1.5px] border-lyght-orange border-t-transparent rounded-full animate-spin mr-1" />
                      )}
                      {ini.planStatus}
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
