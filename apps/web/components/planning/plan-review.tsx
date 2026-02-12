"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PlanDisplay } from "@/components/planning/plan-display";

interface PlanReviewProps {
  issue: {
    id: string;
    number: number;
    title: string;
    description: string;
    status: string;
    aiPlan: string | null;
    planStatus: string;
  };
  projectId: string;
  projectKey: string;
}

export function PlanReview({ issue, projectId, projectKey }: PlanReviewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState(issue.aiPlan || "");

  async function approve() {
    setLoading("approve");
    await fetch(`/api/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planStatus: "approved", status: "ready" }),
    });
    router.push(`/projects/${projectId}/issues/${issue.id}`);
    router.refresh();
  }

  async function reject() {
    if (!feedback.trim()) return;
    setLoading("reject");
    await fetch("/api/ai/revise-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId: issue.id, feedback }),
    });
    setShowReject(false);
    setFeedback("");
    router.refresh();
    setLoading(null);
  }

  async function savePlan() {
    setLoading("save");
    await fetch(`/api/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiPlan: editedPlan }),
    });
    setEditing(false);
    router.refresh();
    setLoading(null);
  }

  async function generatePlan() {
    setLoading("generate");
    await fetch("/api/ai/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId: issue.id }),
    });
    router.refresh();
    setLoading(null);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-lyght-grey-500 font-mono">PL-REVIEW</span>
          <span className="text-lyght-grey-500/40">/</span>
          <span className="text-[14px] font-mono text-lyght-black">
            {projectKey}-{issue.number}: {issue.title}
          </span>
        </div>
        <Badge variant={issue.planStatus === "approved" ? "green" : issue.planStatus === "ready" ? "blue" : "default"}>
          {issue.planStatus}
        </Badge>
      </div>

      {/* Split pane */}
      <div className="grid grid-cols-2 gap-4 h-[calc(100vh-200px)]">
        {/* Left: Issue description */}
        <div className="border border-lyght-grey-300/20 p-4 overflow-y-auto rounded-lg">
          <h2 className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 mb-3">
            ISSUE DESCRIPTION
          </h2>
          <div className="text-[14px] text-lyght-grey-700 font-sans leading-relaxed whitespace-pre-wrap">
            {issue.description}
          </div>
        </div>

        {/* Right: AI Plan */}
        <div className="border border-lyght-grey-300/20 p-4 overflow-y-auto rounded-lg">
          <h2 className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 mb-3">
            AI CODING PLAN
          </h2>

          {!issue.aiPlan ? (
            <div className="text-center py-8">
              <p className="text-[13px] text-lyght-grey-500 mb-4">No plan generated yet.</p>
              <Button onClick={generatePlan} loading={loading === "generate"}>
                GENERATE PLAN
              </Button>
            </div>
          ) : editing ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={editedPlan}
                onChange={(e) => setEditedPlan(e.target.value)}
                className="w-full h-[400px] bg-transparent border border-lyght-grey-300/20 text-lyght-grey-700 font-mono text-[13px] p-3 outline-none focus:border-lyght-orange resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={savePlan} loading={loading === "save"}>SAVE</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditedPlan(issue.aiPlan || ""); }}>CANCEL</Button>
              </div>
            </div>
          ) : (
            <PlanDisplay plan={issue.aiPlan} />
          )}
        </div>
      </div>

      {/* Actions */}
      {issue.aiPlan && (
        <div className="flex items-center gap-3 mt-4">
          <Button onClick={approve} loading={loading === "approve"} disabled={issue.planStatus === "approved"}>
            APPROVE PLAN
          </Button>
          <Button variant="secondary" onClick={() => setShowReject(!showReject)}>
            REJECT
          </Button>
          <Button variant="ghost" onClick={() => setEditing(true)}>
            EDIT
          </Button>
          <Button variant="ghost" onClick={generatePlan} loading={loading === "generate"}>
            REGENERATE
          </Button>
        </div>
      )}

      {/* Reject feedback */}
      {showReject && (
        <div className="mt-4 border border-lyght-grey-300/20 p-4 rounded-lg">
          <Textarea
            label="Feedback for revision"
            placeholder="Explain what needs to change..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="danger" onClick={reject} loading={loading === "reject"} disabled={!feedback.trim()}>
              SUBMIT FEEDBACK
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>
              CANCEL
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
