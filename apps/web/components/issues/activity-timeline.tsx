"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Comment {
  id: string;
  body: string;
  author: string;
  createdAt: Date;
  user: { name: string } | null;
}

export function ActivityTimeline({
  comments,
  issueId,
  projectId,
}: {
  comments: Comment[];
  issueId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function addComment() {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      await fetch(`/api/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment }),
      });
      setNewComment("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const authorColors: Record<string, string> = {
    human: "text-lyght-black",
    agent: "text-lyght-orange",
    system: "text-lyght-grey-500",
  };

  return (
    <div className="flex flex-col gap-4">
      {comments.length === 0 && (
        <div className="text-[13px] text-lyght-grey-500 font-mono">No activity yet.</div>
      )}

      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
            comment.author === "agent" ? "bg-lyght-orange" : comment.author === "system" ? "bg-lyght-grey-500" : "bg-lyght-blue"
          }`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-mono uppercase ${authorColors[comment.author] || "text-lyght-black"}`}>
                {comment.user?.name || comment.author}
              </span>
              <span className="text-[11px] text-lyght-grey-500 font-mono">
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="text-[13px] text-lyght-grey-500 font-mono whitespace-pre-wrap">
              {comment.body}
            </div>
          </div>
        </div>
      ))}

      {/* Add comment */}
      <div className="relative mt-2">
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addComment()}
          placeholder="Leave a comment..."
          className="w-full bg-white border border-lyght-grey-300/30 rounded-lg text-lyght-black font-mono text-[13px] py-3 px-4 pr-16 outline-none focus:border-lyght-grey-300/60 transition-colors"
        />
        {newComment.trim() && (
          <button
            onClick={addComment}
            disabled={loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-lyght-orange rounded-full text-white text-[12px] cursor-pointer hover:bg-lyght-orange/90 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "\u2191"}
          </button>
        )}
      </div>
    </div>
  );
}
