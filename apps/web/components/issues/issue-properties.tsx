"use client";

import { useRouter } from "next/navigation";
import { StatusSelect } from "@/components/issues/status-select";
import { PrioritySelect } from "@/components/issues/priority-select";
import { TypeSelect } from "@/components/issues/type-select";
import { Badge } from "@/components/ui/badge";

interface IssuePropertiesProps {
  issueId: string;
  projectId: string;
  status: string;
  priority: string;
  type: string;
  planStatus: string;
  assigneeName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function IssueProperties({
  issueId,
  projectId,
  status,
  priority,
  type,
  planStatus,
  assigneeName,
  createdAt,
  updatedAt,
}: IssuePropertiesProps) {
  const router = useRouter();

  async function updateField(field: string, value: string) {
    await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    router.refresh();
  }

  return (
    <div className="w-[240px] shrink-0">
      <h3 className="text-[13px] text-lyght-grey-500 font-mono mb-5">
        Properties
      </h3>
      <div className="flex flex-col gap-1">
        <PropertyRow label="Status">
          <StatusSelect value={status} onChange={(v) => updateField("status", v)} />
        </PropertyRow>
        <PropertyRow label="Priority">
          <PrioritySelect value={priority} onChange={(v) => updateField("priority", v)} />
        </PropertyRow>
        <PropertyRow label="Type">
          <TypeSelect value={type} onChange={(v) => updateField("type", v)} />
        </PropertyRow>
        <PropertyRow label="Assignee">
          <span className="text-[13px] font-mono text-lyght-black">
            {assigneeName || "Unassigned"}
          </span>
        </PropertyRow>
        {planStatus !== "none" && (
          <PropertyRow label="Plan">
            <Badge variant={planStatus === "approved" ? "green" : "blue"}>
              {planStatus}
            </Badge>
          </PropertyRow>
        )}

        <PropertyRow label="Created">
          <span className="text-[13px] font-mono text-lyght-grey-500">
            {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </PropertyRow>
        <PropertyRow label="Updated">
          <span className="text-[13px] font-mono text-lyght-grey-500">
            {new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </PropertyRow>
      </div>
    </div>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 -mx-2 px-2 rounded-md hover:bg-lyght-grey-100/50 transition-colors">
      <span className="text-[13px] text-lyght-grey-500 font-mono">{label}</span>
      <div>{children}</div>
    </div>
  );
}
