"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusSelect } from "@/components/issues/status-select";
import { PrioritySelect } from "@/components/issues/priority-select";
import { TypeSelect } from "@/components/issues/type-select";

export default function NewIssuePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;

  const [mode, setMode] = useState<"quick" | "form">("form");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("task");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("triage");
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  async function handleQuickCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, projectId }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/projects/${projectId}/issues/${data.id}`);
      }
    } catch {
      setLoading(false);
    }
  }

  async function handleFormCreate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, type, priority, status }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/projects/${projectId}/issues/${data.id}`);
      }
    } catch {
      setLoading(false);
    }
  }

  async function handleEnhance() {
    setEnhancing(true);
    try {
      const res = await fetch("/api/ai/enhance-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, type }),
      });
      const data = await res.json();
      if (data.description) {
        setDescription(data.description);
      }
    } finally {
      setEnhancing(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-[20px] font-mono font-bold text-lyght-black mb-6">NEW ISSUE</h1>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("form")}
          className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.05em] cursor-pointer rounded-md transition-colors ${
            mode === "form" ? "bg-lyght-orange text-white" : "text-lyght-grey-500 hover:text-lyght-black border border-lyght-grey-300/30"
          }`}
        >
          STRUCTURED
        </button>
        <button
          onClick={() => setMode("quick")}
          className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.05em] cursor-pointer rounded-md transition-colors ${
            mode === "quick" ? "bg-lyght-orange text-white" : "text-lyght-grey-500 hover:text-lyght-black border border-lyght-grey-300/30"
          }`}
        >
          QUICK CREATE (AI)
        </button>
      </div>

      {mode === "quick" ? (
        <div className="flex flex-col gap-4">
          <Textarea
            label="Describe what you need"
            placeholder="Add user authentication with email/password and OAuth via Google. Include password reset flow."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[120px]"
          />
          <Button onClick={handleQuickCreate} loading={loading} disabled={!text.trim()}>
            CREATE WITH AI
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Input label="Title" placeholder="Issue title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            label="Description"
            placeholder="Describe the issue..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Property chips */}
          <div>
            <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono block mb-2">
              PROPERTIES
            </span>
            <div className="flex items-center gap-2">
              <StatusSelect value={status} onChange={setStatus} />
              <PrioritySelect value={priority} onChange={setPriority} />
              <TypeSelect value={type} onChange={setType} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleEnhance} loading={enhancing} disabled={!title.trim()}>
              ENHANCE WITH AI
            </Button>
            <Button onClick={handleFormCreate} loading={loading} disabled={!title.trim()}>
              CREATE ISSUE
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
