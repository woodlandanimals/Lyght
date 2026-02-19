interface StatusLedProps {
  status: string;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

const statusColors: Record<string, string> = {
  // Issue / Initiative statuses
  triage:    "bg-lyght-grey-500",
  planning:  "bg-lyght-blue",
  make:      "bg-lyght-orange",
  review:    "bg-lyght-yellow",
  done:      "bg-lyght-green",
  cancelled: "bg-lyght-grey-300",
  paused:    "bg-lyght-yellow",
  blocked:   "bg-lyght-red",
  // Agent run statuses
  queued:         "bg-lyght-grey-500",
  running:        "bg-lyght-orange",
  waiting_review: "bg-lyght-yellow",
  completed:      "bg-lyght-green",
  failed:         "bg-lyght-red",
  idle:           "bg-lyght-grey-300",
  // Swarm statuses
  forming:    "bg-lyght-grey-500",
  active:     "bg-lyght-orange",
  converging: "bg-lyght-blue",
};

const sizeMap = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-3 h-3",
};

const pulseStatuses = new Set([
  "make",
  "running",
  "active",
]);

export function StatusLed({ status, size = "md", pulse, className = "" }: StatusLedProps) {
  const shouldPulse = pulse ?? pulseStatuses.has(status);
  const color = statusColors[status] || "bg-lyght-grey-500";

  return (
    <span
      className={`
        inline-block rounded-full shrink-0
        ${sizeMap[size]}
        ${color}
        ${shouldPulse ? "animate-pulse-led" : ""}
        ${className}
      `}
      title={status}
    />
  );
}
