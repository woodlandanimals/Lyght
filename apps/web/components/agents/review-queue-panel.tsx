"use client";

import { ReviewCard } from "./review-card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface AgentRun {
  id: string;
  status: string;
  model: string;
  blockerType: string | null;
  blockerMessage: string | null;
  output: string | null;
  issue: {
    id: string;
    number: number;
    title: string;
    projectId: string;
    project: { key: string };
  };
}

interface ReviewItem {
  id: string;
  type: string;
  content: string;
  status: string;
  issue: {
    id: string;
    number: number;
    title: string;
    projectId: string;
    project: { key: string };
  };
}

interface ReviewQueuePanelProps {
  waitingRuns: AgentRun[];
  reviewItems: ReviewItem[];
  onAction: () => void;
}

export function ReviewQueuePanel({
  waitingRuns,
  reviewItems,
  onAction,
}: ReviewQueuePanelProps) {
  const totalCount = waitingRuns.length + reviewItems.length;

  return (
    <div className="overflow-y-auto px-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 pt-1 pb-3">
        <h2 className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">
          Review Queue
        </h2>
        {totalCount > 0 && (
          <Badge variant="yellow">{totalCount}</Badge>
        )}
      </div>

      {/* Content */}
      {totalCount === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="text-[14px] font-mono text-lyght-grey-500 mb-1">
              No items need review
            </div>
            <div className="text-[12px] font-mono text-lyght-grey-500">
              Agent outputs and blocker questions will appear here
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Agent runs needing review */}
          {waitingRuns.map((run) => (
            <ReviewCard key={run.id} run={run} onAction={onAction} />
          ))}

          {/* Standalone review items */}
          {reviewItems.map((item) => (
            <div
              key={item.id}
              className="border border-lyght-grey-300/20 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lyght-yellow text-[13px]">!</span>
                <Link
                  href={`/projects/${item.issue.projectId}/issues/${item.issue.id}`}
                  className="text-[11px] text-lyght-grey-500 font-mono hover:text-lyght-orange transition-colors"
                >
                  {item.issue.project.key}-{item.issue.number}
                </Link>
              </div>
              <p className="text-[13px] text-lyght-black font-mono">
                {item.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
