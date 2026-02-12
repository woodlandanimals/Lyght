"use client";

import { useState } from "react";
import { Popover } from "@/components/ui/popover";
import { CommandList } from "@/components/ui/command-list";

const types = [
  { id: "task", label: "Task", icon: <span className="text-lyght-grey-700 text-[11px]">&#10003;</span> },
  { id: "bug", label: "Bug", icon: <span className="text-lyght-red text-[11px]">&#9679;</span> },
  { id: "feature", label: "Feature", icon: <span className="text-lyght-orange text-[11px]">&#9733;</span> },
  { id: "epic", label: "Epic", icon: <span className="text-lyght-blue text-[11px]">&#9670;</span> },
];

interface TypeSelectProps {
  value: string;
  onChange: (type: string) => void;
  disabled?: boolean;
}

export function TypeSelect({ value, onChange, disabled }: TypeSelectProps) {
  const [open, setOpen] = useState(false);

  const items = types.map((t) => ({
    id: t.id,
    label: t.label,
    icon: t.icon,
  }));

  const current = types.find((t) => t.id === value);

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
        placeholder="Set type..."
        searchable={false}
      />
    </Popover>
  );
}
