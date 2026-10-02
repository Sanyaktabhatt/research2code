import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

/** Visually-hidden text announced by screen readers while a skeleton stands in for real content. */
function LoadingLabel() {
  return <span className="sr-only">Loading…</span>;
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" className={cn("space-y-3 rounded-lg border border-border bg-card p-4", className)}>
      <LoadingLabel />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-sm" />
        <Skeleton className="h-5 w-16 rounded-sm" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" className={cn("space-y-2", className)}>
      <LoadingLabel />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md p-2">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div role="status" className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>
      <LoadingLabel />
      <div className="grid gap-4 border-b border-border bg-muted p-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-3/4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 border-b border-border p-3 last:border-b-0" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-3 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" className={cn("flex h-64 items-end gap-2 rounded-lg border border-border bg-card p-4", className)}>
      <LoadingLabel />
      {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}
