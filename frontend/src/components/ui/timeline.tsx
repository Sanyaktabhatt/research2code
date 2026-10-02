import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/formatters";

export interface TimelineItem {
  id: string;
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Omitted (or null) when the event hasn't happened yet - e.g. a future pipeline stage. */
  timestamp?: string | null;
  tone?: "default" | "success" | "warning" | "destructive";
  iconClassName?: string;
}

const TONE_CLASSES: Record<NonNullable<TimelineItem["tone"]>, string> = {
  default: "border-border bg-card text-muted-foreground",
  success: "border-success/30 bg-success/[0.07] text-success",
  // "warning" is used by every caller to mean in-progress, which the design
  // system renders in the informational blue rather than amber.
  warning: "border-info/30 bg-info/[0.07] text-info",
  destructive: "border-destructive/30 bg-destructive/[0.07] text-destructive",
};

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

/** Shared vertical activity feed / timeline primitive - one component for both use cases. */
export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn("space-y-0", className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        const isLast = index === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && <span className="absolute left-[11px] top-6 h-[calc(100%-1.5rem)] w-px bg-border" aria-hidden />}
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                TONE_CLASSES[item.tone ?? "default"],
              )}
            >
              <Icon className={cn("size-3", item.iconClassName)} />
            </span>
            <div className="min-w-0 flex-1 pt-[3px]">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[13px] font-medium text-foreground">{item.title}</p>
                {item.timestamp && (
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatRelativeTime(item.timestamp)}</span>
                )}
              </div>
              {item.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
