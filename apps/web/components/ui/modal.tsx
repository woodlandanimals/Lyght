"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = "" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`
          bg-white border border-lyght-grey-300
          w-full max-w-lg mx-4
          max-h-[80vh] overflow-y-auto
          rounded-lg shadow-xl
          ${className}
        `}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-lyght-grey-300">
            <h2 className="text-[13px] uppercase tracking-[0.1em] text-lyght-black font-mono font-medium">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-lyght-grey-500 hover:text-lyght-black text-[16px] font-mono cursor-pointer"
            >
              x
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
