interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "orange" | "green" | "red" | "blue" | "yellow";
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-lyght-grey-300/20 text-lyght-grey-500",
  orange: "bg-lyght-orange/15 text-lyght-orange",
  green: "bg-lyght-green/15 text-lyght-green",
  red: "bg-lyght-red/15 text-lyght-red",
  blue: "bg-lyght-blue/15 text-lyght-blue",
  yellow: "bg-lyght-yellow/15 text-lyght-yellow",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center
        px-2 py-0.5
        text-[11px] uppercase tracking-[0.1em]
        font-mono font-medium rounded-full
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
