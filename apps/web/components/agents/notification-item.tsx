"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getAgentTypeById } from "@/lib/agents/agent-registry";

interface Notification {
  id: string;
  type: "failure" | "completed" | "timeout" | "cancelled";
  severity: "urgent" | "info";
  title: string;
  subtitle: string;
  agentTypeId: string;
  sourceRunId: string;
  issueId: string;
  timestamp: string;
}

interface NotificationItemProps {
  notification: Notification;
  projectId: string;
  onAction: () => void;
}

const typeIcons: Record<string, string> = {
  failure: "✕",
  completed: "✓",
  timeout: "⏱",
  cancelled: "—",
};

const severityBorder: Record<string, string> = {
  urgent: "border-l-lyght-red",
  info: "border-l-lyght-grey-300",
};

function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationItem({
  notification,
  projectId,
  onAction,
}: NotificationItemProps) {
  const [loading, setLoading] = useState(false);
  const agent = getAgentTypeById(notification.agentTypeId);
  const icon = typeIcons[notification.type] || "•";
  const border = severityBorder[notification.severity] || "border-l-lyght-grey-300";

  async function acknowledge() {
    setLoading(true);
    await fetch(`/api/agents/${notification.sourceRunId}/acknowledge`, {
      method: "POST",
    });
    setLoading(false);
    onAction();
  }

  return (
    <div
      className={`border-l-2 ${border} pl-3 py-2 pr-2 rounded-r-md hover:bg-lyght-grey-100/30 transition-colors animate-notification-in`}
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <span
          className={`text-[11px] mt-0.5 shrink-0 ${
            notification.severity === "urgent"
              ? "text-lyght-red"
              : "text-lyght-grey-500"
          }`}
        >
          {icon}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-mono text-lyght-black leading-tight">
            {notification.title}
          </div>
          <div className="text-[11px] font-mono text-lyght-grey-500 truncate mt-0.5">
            {agent?.icon} {notification.subtitle}
          </div>
          <div className="text-[10px] font-mono text-lyght-grey-500 mt-1">
            {getTimeAgo(notification.timestamp)}
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1">
          {notification.type === "completed" && (
            <Button size="sm" variant="ghost" onClick={acknowledge} loading={loading}>
              ACK
            </Button>
          )}
          {notification.type === "failure" && (
            <Button size="sm" variant="ghost" onClick={acknowledge} loading={loading}>
              ACK
            </Button>
          )}
          {notification.type === "timeout" && (
            <a href={`/projects/${projectId}/issues/${notification.issueId}`}>
              <Button size="sm" variant="ghost">
                VIEW
              </Button>
            </a>
          )}
          {notification.type === "cancelled" && (
            <Button size="sm" variant="ghost" onClick={acknowledge} loading={loading}>
              ✕
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
