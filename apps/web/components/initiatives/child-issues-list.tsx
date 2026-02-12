"use client";

import Link from "next/link";
import { StatusLed } from "@/components/ui/status-led";
import { Badge } from "@/components/ui/badge";

interface ChildIssue {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  type: string;
  planStatus: string;
}

interface ChildIssuesListProps {
  issues: ChildIssue[];
  projectId: string;
  projectKey: string;
}

const priorityVariant: Record<
  string,
  "orange" | "red" | "yellow" | "blue" | "default"
> = {
  urgent: "red",
  high: "orange",
  medium: "yellow",
  low: "blue",
  none: "default",
};

export function ChildIssuesList({
  issues,
  projectId,
  projectKey,
}: ChildIssuesListProps) {
  if (issues.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-lyght-grey-500 text-[13px] font-mono">
        No issues yet. Generate a spec and create issues from it.
      </div>
    );
  }

  return (
    <div>
      {issues.map((issue, i) => (
        <Link
          key={issue.id}
          href={`/projects/${projectId}/issues/${issue.id}`}
          className={`
            flex items-center gap-4 px-3 py-2.5 rounded-md
            hover:bg-lyght-grey-300/15 transition-colors
            ${i < issues.length - 1 ? "border-b border-lyght-grey-300/8" : ""}
          `}
        >
          <StatusLed status={issue.status} />
          <span className="text-[11px] text-lyght-grey-500 font-mono w-[60px] shrink-0">
            {projectKey}-{issue.number}
          </span>
          <span className="text-[14px] text-lyght-black font-mono flex-1 truncate">
            {issue.title}
          </span>
          <Badge variant={priorityVariant[issue.priority] || "default"}>
            {issue.priority}
          </Badge>
          <Badge>{issue.type}</Badge>
          {issue.planStatus !== "none" && (
            <Badge
              variant={issue.planStatus === "approved" ? "green" : "blue"}
            >
              {issue.planStatus}
            </Badge>
          )}
        </Link>
      ))}
    </div>
  );
}
