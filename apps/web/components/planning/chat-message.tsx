"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlanDisplay } from "@/components/planning/plan-display";

export interface PlanningMessageData {
  id: string;
  role: string;
  type: string;
  content: string;
  metadata: string | null;
  createdAt: string;
}

interface ChatMessageProps {
  message: PlanningMessageData;
  isLatestPlan: boolean;
  isLatestOutput: boolean;
  isLatestBlocker: boolean;
  planStatus: string;
  onAction: (action: string, payload?: string) => void;
  loading: boolean;
}

function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatMessage({
  message,
  isLatestPlan,
  isLatestOutput,
  isLatestBlocker,
  planStatus,
  onAction,
  loading,
}: ChatMessageProps) {
  const [reviseInput, setReviseInput] = useState("");
  const [showRevise, setShowRevise] = useState(false);
  const [blockerResponse, setBlockerResponse] = useState("");

  const metadata = message.metadata ? JSON.parse(message.metadata) : null;

  switch (message.type) {
    case "text":
      return (
        <div
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-message-in`}
        >
          <div
            className={`max-w-[80%] flex items-start gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full mt-2.5 shrink-0 ${
                message.role === "user" ? "bg-lyght-blue" : "bg-lyght-orange"
              }`}
            />
            <div>
              <div
                className={`text-[13px] font-mono whitespace-pre-wrap px-3 py-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-lyght-blue/10 text-lyght-black"
                    : "bg-lyght-orange/10 text-lyght-black"
                }`}
              >
                {message.content}
              </div>
              <div
                className={`text-[10px] font-mono text-lyght-grey-500 mt-1 ${
                  message.role === "user" ? "text-right" : ""
                }`}
              >
                {formatTime(message.createdAt)}
              </div>
            </div>
          </div>
        </div>
      );

    case "plan":
      return (
        <div className="animate-message-in">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lyght-orange text-[12px]">✦</span>
            <span className="text-[12px] font-mono text-lyght-grey-500">
              Plan generated
            </span>
            <span className="text-[10px] font-mono text-lyght-grey-500 ml-auto">
              {formatTime(message.createdAt)}
            </span>
          </div>
          <div className="border border-lyght-grey-300/20 rounded-lg p-4 bg-white">
            <PlanDisplay plan={message.content} />
            {metadata?.cost && (
              <div className="text-[10px] font-mono text-lyght-grey-500 mt-3 pt-2 border-t border-lyght-grey-300/10">
                Cost: ${metadata.cost.toFixed(4)}
              </div>
            )}

            {/* Actions — only on latest plan that hasn't been approved */}
            {isLatestPlan && planStatus !== "approved" && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-lyght-grey-300/10">
                <Button
                  size="sm"
                  onClick={() => onAction("approve_plan")}
                  loading={loading}
                >
                  APPROVE
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowRevise(!showRevise)}
                >
                  REVISE
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAction("generate_plan")}
                  loading={loading}
                >
                  REGENERATE
                </Button>
              </div>
            )}

            {/* Revise input */}
            {showRevise && (
              <div className="flex gap-2 mt-3">
                <input
                  value={reviseInput}
                  onChange={(e) => setReviseInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && reviseInput.trim()) {
                      onAction("revise_plan", reviseInput);
                      setReviseInput("");
                      setShowRevise(false);
                    }
                  }}
                  placeholder="Describe what to change..."
                  className="flex-1 bg-transparent border border-lyght-grey-300/30 rounded-md text-lyght-black font-mono text-[13px] py-1.5 px-3 outline-none focus:border-lyght-orange/40 transition-colors"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (reviseInput.trim()) {
                      onAction("revise_plan", reviseInput);
                      setReviseInput("");
                      setShowRevise(false);
                    }
                  }}
                  loading={loading}
                  disabled={!reviseInput.trim()}
                >
                  SEND
                </Button>
              </div>
            )}
          </div>
        </div>
      );

    case "agent_output":
      return (
        <div className="animate-message-in">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lyght-orange text-[12px]">✦</span>
            <span className="text-[12px] font-mono text-lyght-grey-500">
              Agent output
            </span>
            <span className="text-[10px] font-mono text-lyght-grey-500 ml-auto">
              {formatTime(message.createdAt)}
            </span>
          </div>
          <div className="border border-lyght-grey-300/20 rounded-lg p-4 bg-white">
            <div className="text-[13px] text-lyght-grey-700 font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {message.content}
            </div>
            {metadata?.cost && (
              <div className="text-[10px] font-mono text-lyght-grey-500 mt-3 pt-2 border-t border-lyght-grey-300/10">
                Cost: ${metadata.cost.toFixed(4)}
              </div>
            )}

            {/* Actions — only on latest unresolved output */}
            {isLatestOutput && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-lyght-grey-300/10">
                <Button
                  size="sm"
                  onClick={() => onAction("approve_output")}
                  loading={loading}
                >
                  APPROVE
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onAction("reject_output")}
                  loading={loading}
                >
                  REJECT
                </Button>
              </div>
            )}
          </div>
        </div>
      );

    case "blocker":
      return (
        <div className="animate-message-in">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lyght-yellow text-[12px]">⚠</span>
            <span className="text-[12px] font-mono text-lyght-grey-500">
              Agent needs input
            </span>
            <span className="text-[10px] font-mono text-lyght-grey-500 ml-auto">
              {formatTime(message.createdAt)}
            </span>
          </div>
          <div className="border border-lyght-orange/30 rounded-lg p-4 bg-lyght-orange/5">
            <p className="text-[13px] text-lyght-black font-mono mb-3">
              {message.content}
            </p>

            {/* Response input — only on latest blocker */}
            {isLatestBlocker && (
              <div className="flex gap-2">
                <input
                  value={blockerResponse}
                  onChange={(e) => setBlockerResponse(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && blockerResponse.trim()) {
                      onAction("respond", blockerResponse);
                      setBlockerResponse("");
                    }
                  }}
                  placeholder="Type response..."
                  className="flex-1 bg-white border border-lyght-grey-300/30 rounded-md text-lyght-black font-mono text-[13px] py-1.5 px-3 outline-none focus:border-lyght-orange/40 transition-colors"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (blockerResponse.trim()) {
                      onAction("respond", blockerResponse);
                      setBlockerResponse("");
                    }
                  }}
                  loading={loading}
                  disabled={!blockerResponse.trim()}
                >
                  SEND
                </Button>
              </div>
            )}
          </div>
        </div>
      );

    case "status_change":
      return (
        <div className="flex justify-center animate-message-in">
          <div className="flex items-center gap-2 py-1">
            <span className="text-[11px] font-mono text-lyght-grey-500">
              {message.content}
            </span>
            <span className="text-[10px] font-mono text-lyght-grey-500">
              {getTimeAgo(message.createdAt)}
            </span>
          </div>
        </div>
      );

    case "approval":
      return (
        <div className="flex justify-center animate-message-in">
          <div className="flex items-center gap-2 py-1 px-3 bg-lyght-green/10 rounded-full">
            <span className="text-lyght-green text-[11px]">✓</span>
            <span className="text-[11px] font-mono text-lyght-green">
              {message.content}
            </span>
            <span className="text-[10px] font-mono text-lyght-grey-500">
              {getTimeAgo(message.createdAt)}
            </span>
          </div>
        </div>
      );

    case "error":
      return (
        <div className="animate-message-in">
          <div className="border border-lyght-red/30 rounded-lg p-3 bg-lyght-red/5">
            <div className="flex items-center gap-2">
              <span className="text-lyght-red text-[11px]">✕</span>
              <span className="text-[12px] font-mono text-lyght-red">
                {message.content}
              </span>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="text-[12px] font-mono text-lyght-grey-500">
          {message.content}
        </div>
      );
  }
}
