"use client";

import { AgentStatusPanel } from "./agent-status-panel";
import { ReviewQueuePanel } from "./review-queue-panel";
import { NotificationPanel } from "./notification-panel";
import useSWR from "swr";

interface Props {
  projectId: string;
  projectKey: string;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

export function AgentDashboard({ projectId, projectKey }: Props) {
  const { data, mutate } = useSWR(
    `/api/agents/dashboard?projectId=${projectId}`,
    fetcher,
    {
      refreshInterval: 5000,
      errorRetryCount: 3,
      dedupingInterval: 2000,
    }
  );

  const stats = data?.stats || { totalActive: 0, totalReview: 0, totalCostToday: 0 };
  const agentSummaries = data?.agentSummaries || [];
  const reviewQueue = data?.reviewQueue || { waitingRuns: [], reviewItems: [] };
  const notifications = data?.notifications || [];

  function handleAction() {
    mutate();
  }

  return (
    <div className="-mx-6 -my-6 h-[calc(100vh-49px)] flex flex-col bg-lyght-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-lyght-grey-300/20 shrink-0">
        <h1 className="text-[20px] font-mono font-bold text-lyght-black">
          AG-DASH
        </h1>
        <div className="flex items-center gap-4 text-[13px] font-mono">
          <span className="text-lyght-orange">
            {stats.totalActive} active
          </span>
          <span className="text-lyght-grey-300">·</span>
          <span className="text-lyght-yellow">
            {stats.totalReview} review
          </span>
          <span className="text-lyght-grey-300">·</span>
          <span className="text-lyght-green">
            ${stats.totalCostToday.toFixed(2)} today
          </span>
        </div>
      </div>

      {/* 3-Column Grid */}
      <div className="flex-1 grid grid-cols-[240px_1fr_280px] overflow-hidden">
        <AgentStatusPanel agentSummaries={agentSummaries} />
        <ReviewQueuePanel
          waitingRuns={reviewQueue.waitingRuns}
          reviewItems={reviewQueue.reviewItems}
          onAction={handleAction}
        />
        <NotificationPanel
          notifications={notifications}
          projectId={projectId}
          onAction={handleAction}
        />
      </div>
    </div>
  );
}
