"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-lyght-orange text-white hover:bg-lyght-orange/90 active:bg-lyght-orange/80",
  secondary:
    "bg-transparent border border-lyght-grey-300 text-lyght-black hover:bg-lyght-grey-300/30",
  ghost:
    "bg-transparent text-lyght-grey-500 hover:text-lyght-black hover:bg-lyght-grey-300/20",
  danger:
    "bg-lyght-red text-white hover:bg-lyght-red/90",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-[11px]",
  md: "px-4 py-2 text-[13px]",
  lg: "px-6 py-3 text-[14px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2
          font-mono uppercase tracking-[0.05em] font-medium
          transition-colors duration-100
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer rounded-md
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
