"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  onAction: (action: string) => void;
  planStatus: string;
  entityStatus: string;
  entityType?: "issue" | "initiative";
  loading: boolean;
  hasBlocker: boolean;
}

export function ChatInput({
  onSend,
  onAction,
  planStatus,
  entityStatus,
  entityType = "issue",
  loading,
  hasBlocker,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    if (!value.trim() || loading) return;
    onSend(value.trim());
    setValue("");
    inputRef.current?.focus();
  }

  const isInitiative = entityType === "initiative";

  // Determine which quick action to show
  const showGeneratePlan = isInitiative
    ? planStatus === "none" && (entityStatus === "planned" || entityStatus === "in_progress")
    : planStatus === "none" && (entityStatus === "planning" || entityStatus === "triage");

  const showExecute =
    !isInitiative &&
    planStatus === "approved" &&
    entityStatus !== "in_progress" &&
    entityStatus !== "in_review" &&
    entityStatus !== "done" &&
    !hasBlocker;

  const showCreateIssues =
    isInitiative &&
    planStatus === "approved" &&
    entityStatus !== "completed" &&
    entityStatus !== "cancelled";

  return (
    <div className="border-t border-lyght-grey-300/20 bg-white px-4 py-3">
      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lyght-orange text-[12px] animate-pulse">{"\u2726"}</span>
          <span className="text-[12px] font-mono text-lyght-grey-500 animate-pulse">
            thinking...
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Leave a comment..."
          disabled={loading}
          className="flex-1 bg-transparent border border-lyght-grey-300/30 rounded-lg text-lyght-black font-mono text-[13px] py-2.5 px-3 outline-none focus:border-lyght-grey-300/60 transition-colors disabled:opacity-50"
        />

        {/* Send button */}
        {value.trim() && (
          <button
            onClick={handleSend}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center bg-lyght-orange rounded-full text-white text-[13px] cursor-pointer hover:bg-lyght-orange/90 transition-colors disabled:opacity-50 shrink-0"
          >
            {"\u2191"}
          </button>
        )}

        {/* Quick action buttons */}
        {showGeneratePlan && (
          <Button
            size="sm"
            onClick={() => onAction("generate_plan")}
            loading={loading}
            className="shrink-0"
          >
            {isInitiative ? "\u26A1 SPEC" : "\u26A1 PLAN"}
          </Button>
        )}

        {showExecute && (
          <Button
            size="sm"
            onClick={() => onAction("execute")}
            loading={loading}
            className="shrink-0"
          >
            {"\u25B6"} EXECUTE
          </Button>
        )}

        {showCreateIssues && (
          <Button
            size="sm"
            onClick={() => onAction("create_issues")}
            loading={loading}
            className="shrink-0"
          >
            {"\u{1F4CB}"} CREATE ISSUES
          </Button>
        )}
      </div>
    </div>
  );
}
