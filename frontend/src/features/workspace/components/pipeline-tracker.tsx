import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { ListSkeleton } from "@/components/feedback/skeletons";
import { formatDuration } from "@/lib/utils/formatters";
import type { PipelineStageInfo } from "@/features/workspace/types";
import type { PipelineStageStatus } from "@/types/domain";

const STATUS_ICON: Record<PipelineStageStatus, typeof CheckCircle2> = {
  pending: CircleDashed,
  running: Loader2,
  success: CheckCircle2,
  error: XCircle,
};

const STATUS_TONE: Record<PipelineStageStatus, TimelineItem["tone"]> = {
  pending: "default",
  running: "warning",
  success: "success",
  error: "destructive",
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

  const items: TimelineItem[] = stages.map((stage) => ({
    id: stage.id,
    icon: STATUS_ICON[stage.status],
    iconClassName: stage.status === "running" ? "animate-spin" : undefined,
    title: stage.label,
    description: stage.durationSeconds !== null ? `Took ${formatDuration(stage.durationSeconds)}` : undefined,
    timestamp: stage.timestamp,
    tone: STATUS_TONE[stage.status],
  }));

  return <Timeline items={items} />;
}
