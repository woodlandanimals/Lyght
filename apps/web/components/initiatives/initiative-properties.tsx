"use client";

import { useRouter } from "next/navigation";
import { InitiativeStatusSelect } from "@/components/initiatives/initiative-status-select";
import { PrioritySelect } from "@/components/issues/priority-select";
import { Badge } from "@/components/ui/badge";

interface InitiativePropertiesProps {
  initiativeId: string;
  status: string;
  priority: string;
  planStatus: string;
  leadName?: string | null;
  issueCount: number;
  doneCount: number;
  createdAt: string;
  updatedAt: string;
}

export function InitiativeProperties({
  initiativeId,
  status,
  priority,
  planStatus,
  leadName,
  issueCount,
  doneCount,
  createdAt,
  updatedAt,
}: InitiativePropertiesProps) {
  const router = useRouter();

  async function updateField(field: string, value: string) {
    await fetch(`/api/initiatives/${initiativeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    router.refresh();
  }

  const progressPct = issueCount > 0 ? Math.round((doneCount / issueCount) * 100) : 0;

  return (
    <div className="w-[240px] shrink-0">
      <h3 className="text-[13px] text-lyght-grey-500 font-mono mb-5">
        Properties
      </h3>
      <div className="flex flex-col gap-1">
        <PropertyRow label="Status">
          <InitiativeStatusSelect
            value={status}
            onChange={(v) => updateField("status", v)}
          />
        </PropertyRow>
        <PropertyRow label="Priority">
          <PrioritySelect
            value={priority}
            onChange={(v) => updateField("priority", v)}
          />
        </PropertyRow>
        <PropertyRow label="Lead">
          <span className="text-[13px] font-mono text-lyght-black">
            {leadName || "Unassigned"}
          </span>
        </PropertyRow>
        {planStatus !== "none" && (
          <PropertyRow label="Plan">
            <Badge
              variant={
                planStatus === "approved"
                  ? "green"
                  : planStatus === "generating"
                    ? "orange"
                    : "blue"
              }
            >
              {planStatus === "generating" && (
                <span className="inline-block w-2.5 h-2.5 border-[1.5px] border-lyght-orange border-t-transparent rounded-full animate-spin mr-1" />
              )}
              {planStatus}
            </Badge>
          </PropertyRow>
        )}
        <PropertyRow label="Progress">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-lyght-grey-300/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-lyght-orange rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-lyght-grey-500">
              {doneCount}/{issueCount}
            </span>
          </div>
        </PropertyRow>
        <PropertyRow label="Created">
          <span className="text-[13px] font-mono text-lyght-grey-500">
            {new Date(createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </PropertyRow>
        <PropertyRow label="Updated">
          <span className="text-[13px] font-mono text-lyght-grey-500">
            {new Date(updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </PropertyRow>
      </div>
    </div>
  );
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 -mx-2 px-2 rounded-md hover:bg-lyght-grey-100/50 transition-colors">
      <span className="text-[13px] text-lyght-grey-500 font-mono">{label}</span>
      <div>{children}</div>
    </div>
  );
}
