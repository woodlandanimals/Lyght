"use client";

import { useRef, useEffect, useState, ReactNode } from "react";

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Popover({ open, onClose, trigger, children, align = "left", className = "" }: PopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  return (
    <div ref={containerRef} className="relative inline-block">
      {trigger}
      {open && (
        <div
          className={`
            absolute z-50 mt-1
            bg-white border border-lyght-grey-300/30 rounded-lg shadow-lg
            min-w-[200px] max-w-[280px]
            animate-popover-in
            ${align === "right" ? "right-0" : "left-0"}
            ${className}
          `}
        >
          {children}
        </div>
      )}
    </div>
  );
}
