interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = "", lines = 1 }: SkeletonProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-lyght-grey-300/30 animate-pulse rounded-md"
          style={{ width: `${Math.max(40, 100 - i * 15)}%` }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="border border-lyght-grey-300/20 p-4 rounded-lg">
      <Skeleton lines={3} />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-lyght-grey-300/20 rounded-lg">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`px-4 py-3 ${i < rows - 1 ? "border-b border-lyght-grey-300/10" : ""}`}
        >
          <Skeleton />
        </div>
      ))}
    </div>
  );
}
