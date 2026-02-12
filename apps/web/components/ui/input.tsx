"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full bg-transparent
            border border-lyght-grey-300/40 rounded-md
            text-lyght-black font-mono text-[14px]
            py-2 px-3
            outline-none
            focus:border-lyght-orange focus:ring-1 focus:ring-lyght-orange/20
            transition-all duration-100
            placeholder:text-lyght-grey-500
            ${className}
          `}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
