import { Circle, CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { ListSkeleton } from "@/components/feedback/skeletons";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatDuration, formatRelativeTime } from "@/lib/utils/formatters";
import type { PipelineStageInfo } from "@/features/workspace/types";
import type { PipelineStageStatus } from "@/types/domain";

const STATUS_PRESENTATION: Record<PipelineStageStatus, { icon: typeof Circle; className: string; label: string }> = {
  pending: { icon: Circle, className: "text-muted-foreground/50", label: "Pending" },
  running: { icon: LoaderCircle, className: "animate-spin text-info", label: "In progress" },
  success: { icon: CircleCheck, className: "text-success", label: "Completed" },
  error: { icon: CircleX, className: "text-destructive", label: "Failed" },
};

interface PipelineTrackerProps {
  stages: PipelineStageInfo[];
  isLoading?: boolean;
  /** True while stages come from polling/WebSocket rather than a one-shot fetch - reserved for a future "Live" indicator. */
  isLive?: boolean;
}

/**
 * Renders whatever stage list it's given - the polling-vs-WebSocket
 * decision lives entirely in usePipelineTracker, so swapping the data
 * source later never touches this component.
 */
export function PipelineTracker({ stages, isLoading }: PipelineTrackerProps) {
  if (isLoading) return <ListSkeleton rows={5} />;

  return (
    <ol className="space-y-0">
      {stages.map((stage, index) => {
        const presentation = STATUS_PRESENTATION[stage.status];
        const Icon = presentation.icon;
        const isLast = index === stages.length - 1;
        const meta = [
          stage.timestamp ? formatRelativeTime(stage.timestamp) : null,
          stage.durationSeconds !== null ? `took ${formatDuration(stage.durationSeconds)}` : null,
        ].filter(Boolean);

        return (
          <li key={stage.id} className="relative flex gap-2.5 pb-2.5 last:pb-0">
            {!isLast && (
              <span
                className={cn("absolute left-[6.5px] top-[18px] h-[calc(100%-16px)] w-px", stage.status === "success" ? "bg-success/35" : "bg-border")}
                aria-hidden="true"
              />
            )}
            <Icon className={cn("relative mt-[3px] size-3.5 shrink-0 bg-card", presentation.className)} strokeWidth={2} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[13px] leading-5",
                  stage.status === "pending" ? "text-muted-foreground" : "font-medium text-foreground",
                )}
              >
                {stage.label}
                <span className="sr-only"> - {presentation.label}</span>
              </p>
              {meta.length > 0 && (
                <p className="text-[11px] leading-4 tabular-nums text-muted-foreground" title={stage.timestamp ? formatDateTime(stage.timestamp) : undefined}>
                  {meta.join(" · ")}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
