"use client";

import { NotificationItem } from "./notification-item";
import { Badge } from "@/components/ui/badge";

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

interface NotificationPanelProps {
  notifications: Notification[];
  projectId: string;
  onAction: () => void;
}

export function NotificationPanel({
  notifications,
  projectId,
  onAction,
}: NotificationPanelProps) {
  const urgentCount = notifications.filter(
    (n) => n.severity === "urgent"
  ).length;

  return (
    <div className="border-l border-lyght-grey-300/20 pl-0 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-1 pb-3">
        <h2 className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">
          Notifications
        </h2>
        {urgentCount > 0 && (
          <Badge variant="red">{urgentCount}</Badge>
        )}
      </div>

      {/* Content */}
      {notifications.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center py-12">
            <div className="text-[13px] font-mono text-lyght-grey-500">
              All clear
            </div>
            <div className="text-[11px] font-mono text-lyght-grey-500 mt-1">
              No notifications
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1 px-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              projectId={projectId}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
