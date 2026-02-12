"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusSelect } from "@/components/issues/status-select";
import { PrioritySelect } from "@/components/issues/priority-select";
import { TypeSelect } from "@/components/issues/type-select";

export function QuickCreateModal() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"structured" | "ai">("structured");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("triage");
  const [priority, setPriority] = useState("none");
  const [type, setType] = useState("task");
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && e.target === document.body) {
        e.preventDefault();
        setOpen(true);
      }
    }
    function handleOpenEvent() {
      setOpen(true);
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("open-create-issue", handleOpenEvent);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("open-create-issue", handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open && titleRef.current && mode === "structured") {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open, mode]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setStatus("triage");
    setPriority("none");
    setType("task");
    setAiText("");
    setMode("structured");
  }

  function handleClose() {
    setOpen(false);
    resetForm();
  }

  async function handleStructuredCreate() {
    if (!title.trim() || !projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, type, priority, status }),
      });
      const data = await res.json();
      if (data.id) {
        handleClose();
        router.push(`/projects/${projectId}/issues/${data.id}`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAiCreate() {
    if (!aiText.trim() || !projectId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText, projectId }),
      });
      const data = await res.json();
      if (data.id) {
        handleClose();
        router.push(`/projects/${projectId}/issues/${data.id}`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} className="max-w-xl">
      <div className="p-4">
        {mode === "structured" ? (
          <>
            {/* Title */}
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              className="w-full text-[16px] font-mono font-medium text-lyght-black bg-transparent outline-none placeholder:text-lyght-grey-500 mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && title.trim()) {
                  handleStructuredCreate();
                }
              }}
            />

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description..."
              className="w-full text-[13px] font-mono text-lyght-grey-700 bg-transparent outline-none placeholder:text-lyght-grey-500 resize-none min-h-[60px] mb-4"
              rows={3}
            />

            {/* Property chips bar */}
            <div className="flex items-center gap-2 pb-4 border-b border-lyght-grey-300/20 mb-4">
              <StatusSelect value={status} onChange={setStatus} />
              <PrioritySelect value={priority} onChange={setPriority} />
              <TypeSelect value={type} onChange={setType} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMode("ai")}
                className="text-[11px] font-mono text-lyght-grey-500 hover:text-lyght-orange transition-colors cursor-pointer"
              >
                USE AI INSTEAD
              </button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleClose}>CANCEL</Button>
                <Button size="sm" onClick={handleStructuredCreate} loading={loading} disabled={!title.trim()}>
                  CREATE ISSUE
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* AI mode */}
            <div className="mb-3">
              <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">
                DESCRIBE WITH AI
              </span>
            </div>
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Describe what you need in natural language..."
              className="w-full text-[13px] font-mono text-lyght-black bg-transparent border border-lyght-grey-300/40 rounded-md outline-none placeholder:text-lyght-grey-500 p-3 resize-none min-h-[100px] mb-4 focus:border-lyght-orange focus:ring-1 focus:ring-lyght-orange/20 transition-all"
              autoFocus
            />

            <div className="flex items-center justify-between">
              <button
                onClick={() => setMode("structured")}
                className="text-[11px] font-mono text-lyght-grey-500 hover:text-lyght-orange transition-colors cursor-pointer"
              >
                USE FORM INSTEAD
              </button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleClose}>CANCEL</Button>
                <Button size="sm" onClick={handleAiCreate} loading={loading} disabled={!aiText.trim()}>
                  CREATE WITH AI
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
