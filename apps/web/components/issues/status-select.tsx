"use client";

import { useState } from "react";
import { Popover } from "@/components/ui/popover";
import { CommandList } from "@/components/ui/command-list";
import { StatusLed } from "@/components/ui/status-led";

const statuses = [
  { id: "triage", label: "Triage" },
  { id: "planning", label: "Planning" },
  { id: "planned", label: "Planned" },
  { id: "ready", label: "Ready" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
  { id: "closed", label: "Closed" },
];

interface StatusSelectProps {
  value: string;
  onChange: (status: string) => void;
  disabled?: boolean;
}

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps) {
  const [open, setOpen] = useState(false);

  const items = statuses.map((s) => ({
    id: s.id,
    label: s.label,
    icon: <StatusLed status={s.id} size="sm" />,
  }));

  const currentLabel = statuses.find((s) => s.id === value)?.label || value;

  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      trigger={
        <button
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className={`
            inline-flex items-center gap-1.5 px-2 py-1
            text-[13px] font-mono rounded-md
            hover:bg-lyght-grey-100 transition-colors
            cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <StatusLed status={value} size="sm" />
          <span className="text-lyght-black">{currentLabel}</span>
        </button>
      }
    >
      <CommandList
        items={items}
        selected={value}
        onSelect={(id) => {
          onChange(id);
          setOpen(false);
        }}
        placeholder="Change status..."
      />
    </Popover>
  );
}
