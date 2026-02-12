"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatMessage, type PlanningMessageData } from "./chat-message";
import { ChatInput } from "./chat-input";

interface PlanningChatProps {
  entityId: string;
  entityType?: "issue" | "initiative";
  projectId: string;
  initialMessages: PlanningMessageData[];
  entityStatus: string;
  planStatus: string;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

export function PlanningChat({
  entityId,
  entityType = "issue",
  projectId,
  initialMessages,
  entityStatus: initialEntityStatus,
  planStatus: initialPlanStatus,
}: PlanningChatProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const apiUrl =
    entityType === "initiative"
      ? `/api/initiatives/${entityId}/chat`
      : `/api/issues/${entityId}/chat`;

  const { data, mutate } = useSWR(apiUrl, fetcher, {
    refreshInterval: 3000,
    fallbackData: {
      messages: initialMessages,
      planStatus: initialPlanStatus,
      entityStatus: initialEntityStatus,
      issueStatus: initialEntityStatus,
    },
    dedupingInterval: 2000,
  });

  const messages: PlanningMessageData[] = data?.messages || [];
  const planStatus = data?.planStatus || initialPlanStatus;
  const entityStatus =
    data?.entityStatus || data?.issueStatus || initialEntityStatus;

  // Find latest plan, output, and blocker messages for action visibility
  const latestPlanId = [...messages]
    .reverse()
    .find((m) => m.type === "plan")?.id;
  const latestOutputId = [...messages]
    .reverse()
    .find((m) => m.type === "agent_output")?.id;
  const latestBlockerId = [...messages]
    .reverse()
    .find((m) => m.type === "blocker")?.id;

  // Check if the latest blocker has been responded to
  const hasActiveBlocker = (() => {
    if (!latestBlockerId) return false;
    const blockerIdx = messages.findIndex((m) => m.id === latestBlockerId);
    const hasResponse = messages
      .slice(blockerIdx + 1)
      .some((m) => m.role === "user" && m.type === "text");
    return !hasResponse;
  })();

  // Check if the latest output has been approved
  const hasActiveOutput = (() => {
    if (!latestOutputId) return false;
    const outputIdx = messages.findIndex((m) => m.id === latestOutputId);
    const hasApproval = messages
      .slice(outputIdx + 1)
      .some((m) => m.type === "approval");
    return !hasApproval;
  })();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const sendAction = useCallback(
    async (action: string, payload?: string) => {
      setLoading(true);
      try {
        const body: Record<string, string> = { action };
        if (payload) body.message = payload;

        // Find the runId for respond actions (issue only)
        if (action === "respond" && latestBlockerId) {
          const blockerMsg = messages.find((m) => m.id === latestBlockerId);
          if (blockerMsg?.metadata) {
            const meta = JSON.parse(blockerMsg.metadata);
            if (meta.runId) body.runId = meta.runId;
          }
        }

        // Handle approve/reject output via agent APIs (issue only)
        if (entityType === "issue" && action === "approve_output" && latestOutputId) {
          const outputMsg = messages.find((m) => m.id === latestOutputId);
          if (outputMsg?.metadata) {
            const meta = JSON.parse(outputMsg.metadata);
            if (meta.runId) {
              await fetch(`/api/agents/${meta.runId}/approve`, {
                method: "POST",
              });
              await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "comment",
                  message: "Output approved \u2713",
                }),
              });
              await mutate();
              router.refresh();
              return;
            }
          }
        }

        if (entityType === "issue" && action === "reject_output" && latestOutputId) {
          const outputMsg = messages.find((m) => m.id === latestOutputId);
          if (outputMsg?.metadata) {
            const meta = JSON.parse(outputMsg.metadata);
            if (meta.runId) {
              await fetch(`/api/agents/${meta.runId}/cancel`, {
                method: "POST",
              });
              await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "comment",
                  message: "Output rejected \u2715",
                }),
              });
              await mutate();
              router.refresh();
              return;
            }
          }
        }

        await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        await mutate();
        router.refresh();
      } finally {
        setLoading(false);
      }
    },
    [entityType, apiUrl, latestBlockerId, latestOutputId, messages, mutate, router]
  );

  const handleSend = useCallback(
    (message: string) => {
      sendAction("comment", message);
    },
    [sendAction]
  );

  const handleQuickAction = useCallback(
    (action: string) => {
      sendAction(action);
    },
    [sendAction]
  );

  const handleMessageAction = useCallback(
    (action: string, payload?: string) => {
      sendAction(action, payload);
    },
    [sendAction]
  );

  const isInitiative = entityType === "initiative";
  const headerLabel = isInitiative ? "Spec" : "Planning";
  const emptyTitle = isInitiative ? "Ready to spec" : "Ready to plan";
  const emptyDescription = isInitiative
    ? "Generate a spec for this project"
    : "Generate an AI plan for this issue";
  const emptyButtonLabel = isInitiative
    ? "\u26A1 GENERATE SPEC"
    : "\u26A1 GENERATE PLAN";

  return (
    <div
      className="border border-lyght-grey-300/20 rounded-lg bg-lyght-white flex flex-col overflow-hidden"
      style={{ height: "calc(100vh - 380px)", minHeight: "400px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-lyght-grey-300/20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lyght-orange text-[13px]">✦</span>
          <h2 className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">
            {headerLabel}
          </h2>
        </div>
        <Badge
          variant={
            planStatus === "approved"
              ? "green"
              : planStatus === "ready"
                ? "blue"
                : planStatus === "generating"
                  ? "orange"
                  : "default"
          }
        >
          {planStatus === "generating" && (
            <span className="inline-block w-2.5 h-2.5 border-[1.5px] border-lyght-orange border-t-transparent rounded-full animate-spin mr-1.5" />
          )}
          {planStatus === "none" ? "no plan" : planStatus}
        </Badge>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              <div className="text-lyght-orange text-[24px] mb-3">{"\u2726"}</div>
              <div className="text-[14px] font-mono text-lyght-black mb-1">
                {emptyTitle}
              </div>
              <div className="text-[12px] font-mono text-lyght-grey-500 mb-4">
                {emptyDescription}
              </div>
              <Button
                onClick={() => handleQuickAction("generate_plan")}
                loading={loading}
              >
                {emptyButtonLabel}
              </Button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isLatestPlan={msg.id === latestPlanId}
              isLatestOutput={msg.id === latestOutputId && hasActiveOutput}
              isLatestBlocker={msg.id === latestBlockerId && hasActiveBlocker}
              planStatus={planStatus}
              onAction={handleMessageAction}
              loading={loading}
            />
          ))
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onAction={handleQuickAction}
        planStatus={planStatus}
        entityStatus={entityStatus}
        entityType={entityType}
        loading={loading}
        hasBlocker={hasActiveBlocker}
      />
    </div>
  );
}
