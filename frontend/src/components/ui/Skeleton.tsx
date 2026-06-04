import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/** Placeholder shimmer that matches content dimensions. Prevents layout shift during loading. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-foreground/8", className)}
      aria-hidden="true"
      role="presentation"
    />
  );
}

/** Pre-built skeleton rows for tables and lists. */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" aria-hidden="true" role="presentation">
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded-sm bg-foreground/8"
          style={{ width: i === 0 ? "40%" : "18%" }}
        />
      ))}
    </div>
  );
}

/** Card-shaped skeleton for content panels. */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div
      className={cn("rounded-sm border border-border/40 bg-background-panel/40 p-6 space-y-4", className)}
      aria-hidden="true"
      role="presentation"
    >
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
