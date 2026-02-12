"use client";

import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className = "", id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            w-full bg-transparent
            border border-lyght-grey-300/40 rounded-md
            text-lyght-black font-mono text-[14px]
            py-2 px-3
            outline-none
            focus:border-lyght-orange focus:ring-1 focus:ring-lyght-orange/20
            transition-all duration-100
            placeholder:text-lyght-grey-500
            resize-y min-h-[80px]
            ${className}
          `}
          {...props}
        />
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
