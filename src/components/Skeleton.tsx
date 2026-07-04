import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/**
 * An animated skeleton placeholder for loading states.
 */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-lg bg-rosely-petal", className)} />;
}

/**
 * A card-shaped skeleton placeholder.
 */
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-rosely-blush bg-card p-4",
        className
      )}
    >
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

/**
 * A table-shaped skeleton placeholder.
 */
export function TableSkeleton({
  rows = 5,
  cols = 4,
  className,
}: SkeletonProps & { rows?: number; cols?: number }) {
  return (
    <div
      className={cn("overflow-hidden rounded-xl border border-rosely-blush bg-card", className)}
    >
      {/* Header */}
      <div className="flex gap-4 border-b border-rosely-blush px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 border-b border-rosely-petal px-4 py-3 last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * A page-level skeleton with header, search bar, and table.
 */
export function PageSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      {/* Title */}
      <Skeleton className="h-7 w-48" />
      {/* Search + filters bar */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
      {/* Table */}
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
