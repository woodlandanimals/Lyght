"use client";

import { useState } from "react";
import { Popover } from "@/components/ui/popover";
import { CommandList } from "@/components/ui/command-list";

const priorities = [
  { id: "urgent", label: "Urgent", icon: <span className="text-lyght-red text-[11px]">!!!</span> },
  { id: "high", label: "High", icon: <span className="text-lyght-orange text-[11px]">!!</span> },
  { id: "medium", label: "Medium", icon: <span className="text-lyght-yellow text-[11px]">!</span> },
  { id: "low", label: "Low", icon: <span className="text-lyght-blue text-[11px]">&darr;</span> },
  { id: "none", label: "None", icon: <span className="text-lyght-grey-500 text-[11px]">&mdash;</span> },
];

const priorityColors: Record<string, string> = {
  urgent: "text-lyght-red",
  high: "text-lyght-orange",
  medium: "text-lyght-yellow",
  low: "text-lyght-blue",
  none: "text-lyght-grey-500",
};

interface PrioritySelectProps {
  value: string;
  onChange: (priority: string) => void;
  disabled?: boolean;
}

export function PrioritySelect({ value, onChange, disabled }: PrioritySelectProps) {
  const [open, setOpen] = useState(false);

  const items = priorities.map((p) => ({
    id: p.id,
    label: p.label,
    icon: p.icon,
  }));

  const current = priorities.find((p) => p.id === value);
  const colorClass = priorityColors[value] || "text-lyght-grey-500";

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
          {current?.icon}
          <span className="text-lyght-black">{current?.label || value}</span>
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
        placeholder="Set priority..."
      />
    </Popover>
  );
}
