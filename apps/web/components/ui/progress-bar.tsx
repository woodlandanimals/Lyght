interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
}

export function ProgressBar({ value, className = "" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={`w-full h-[2px] bg-lyght-grey-300 rounded-full ${className}`}>
      <div
        className="h-full bg-lyght-orange transition-all duration-300 rounded-full"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
