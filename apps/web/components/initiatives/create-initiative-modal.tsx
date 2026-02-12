"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PrioritySelect } from "@/components/issues/priority-select";

export function CreateInitiativeModal() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleOpenEvent() {
      setOpen(true);
    }
    document.addEventListener("open-create-initiative", handleOpenEvent);
    return () => {
      document.removeEventListener("open-create-initiative", handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open && titleRef.current) {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setPriority("medium");
  }

  function handleClose() {
    setOpen(false);
    resetForm();
  }

  async function handleCreate() {
    if (!title.trim() || !projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/initiatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority }),
      });
      const data = await res.json();
      if (data.id) {
        handleClose();
        router.push(`/projects/${projectId}/initiatives/${data.id}`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} className="max-w-xl">
      <div className="p-4">
        <div className="mb-3">
          <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">
            NEW PROJECT
          </span>
        </div>

        {/* Title */}
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title"
          className="w-full text-[16px] font-mono font-medium text-lyght-black bg-transparent outline-none placeholder:text-lyght-grey-500 mb-2"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && title.trim()) {
              handleCreate();
            }
          }}
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the project scope and goals..."
          className="w-full text-[13px] font-mono text-lyght-grey-700 bg-transparent outline-none placeholder:text-lyght-grey-500 resize-none min-h-[80px] mb-4"
          rows={4}
        />

        {/* Property chips bar */}
        <div className="flex items-center gap-2 pb-4 border-b border-lyght-grey-300/20 mb-4">
          <PrioritySelect value={priority} onChange={setPriority} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            CANCEL
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            loading={loading}
            disabled={!title.trim()}
          >
            CREATE PROJECT
          </Button>
        </div>
      </div>
    </Modal>
  );
}
