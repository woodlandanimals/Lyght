interface StatusLedProps {
  status: string;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

const statusColors: Record<string, string> = {
  triage: "bg-lyght-grey-500",
  planning: "bg-lyght-blue",
  planned: "bg-lyght-blue",
  ready: "bg-lyght-blue",
  in_progress: "bg-lyght-orange",
  swarming: "bg-lyght-orange",
  in_review: "bg-lyght-yellow",
  done: "bg-lyght-green",
  closed: "bg-lyght-green",
  blocked: "bg-lyght-red",
  // Agent statuses
  queued: "bg-lyght-grey-500",
  running: "bg-lyght-orange",
  waiting_review: "bg-lyght-yellow",
  completed: "bg-lyght-green",
  failed: "bg-lyght-red",
  cancelled: "bg-lyght-grey-300",
  // Dashboard agent statuses
  idle: "bg-lyght-grey-300",
  // Swarm statuses
  forming: "bg-lyght-grey-500",
  active: "bg-lyght-orange",
  paused: "bg-lyght-yellow",
  converging: "bg-lyght-blue",
};

const sizeMap = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-3 h-3",
};

const pulseStatuses = new Set([
  "in_progress",
  "swarming",
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
