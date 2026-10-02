import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/formatters";

export interface ActivityFeedItem {
  id: string;
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  timestamp: string;
  /** Derived by the caller from the record's real status - this component never infers it. */
  tone?: "default" | "success" | "warning" | "destructive";
}

/** Status dot colors. "warning" is the in-progress tone across the app, rendered in the informational blue. */
const TONE_DOT: Record<NonNullable<ActivityFeedItem["tone"]>, string> = {
  default: "bg-muted-foreground/45",
  success: "bg-success",
  warning: "bg-info",
  destructive: "bg-destructive",
};

const TONE_LABEL: Record<NonNullable<ActivityFeedItem["tone"]>, string> = {
  default: "Neutral",
  success: "Succeeded",
  warning: "In progress",
  destructive: "Failed",
};

interface ActivityFeedProps {
  items: ActivityFeedItem[];
  /**
   * "inline" puts the timestamp in a right-aligned column (wide cards);
   * "stacked" puts it under the title (narrow side panels), so titles get
   * the full row width instead of being truncated.
   */
  layout?: "inline" | "stacked";
  className?: string;
}

/**
 * Recent-activity feed: neutral line icons on a thin connector, with status
 * carried by a small dot rather than a colored ring around every icon.
 */
export function ActivityFeed({ items, layout = "inline", className }: ActivityFeedProps) {
  return (
    <ol className={cn("divide-y divide-border", className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        const tone = item.tone ?? "default";
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        const time = (
          <time
            dateTime={item.timestamp}
            title={formatDateTime(item.timestamp)}
            className="whitespace-nowrap text-xs tabular-nums text-muted-foreground"
          >
            {formatRelativeTime(item.timestamp)}
          </time>
        );

        return (
          <li key={item.id} className="relative flex gap-3 px-[var(--feed-inset,0px)] py-2.5 transition-colors duration-100 hover:bg-accent/40">
            {/* Connector segments run behind the icon column and stop at the
                first/last rows, so the line reads as one continuous rail. */}
            <span className="relative flex w-7 shrink-0 justify-center" aria-hidden="true">
              {!isFirst && <span className="absolute -top-2.5 h-2.5 w-px bg-border" />}
              {!isLast && <span className="absolute -bottom-2.5 top-7 w-px bg-border" />}
              <span className="relative flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                <Icon className="size-3.5" strokeWidth={1.75} />
                <span className={cn("absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-card", TONE_DOT[tone])} />
              </span>
            </span>

            <div className={cn("min-w-0 flex-1 pt-[5px]", layout === "inline" && "flex items-start justify-between gap-4")}>
              <div className="min-w-0">
                <p className="break-words text-[13px] font-medium leading-snug text-foreground">
                  {item.title}
                  <span className="sr-only"> - {TONE_LABEL[tone]}</span>
                </p>
                {item.description && <p className="mt-0.5 break-words text-xs text-muted-foreground">{item.description}</p>}
                {layout === "stacked" && <div className="mt-0.5">{time}</div>}
              </div>
              {layout === "inline" && <div className="shrink-0 pt-px">{time}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
