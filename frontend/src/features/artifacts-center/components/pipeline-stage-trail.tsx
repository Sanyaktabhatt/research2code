import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PIPELINE_STAGES, type PipelineStage } from "@/features/artifacts-center/types";

interface PipelineStageTrailProps {
  stage: PipelineStage;
  className?: string;
}

/** The 8-stage pipeline trail (Paper Upload -> ... -> Results), with the artifact's originating stage highlighted. */
export function PipelineStageTrail({ stage, className }: PipelineStageTrailProps) {
  const activeIndex = PIPELINE_STAGES.indexOf(stage);

  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-1 text-xs", className)}>
      {PIPELINE_STAGES.map((s, index) => (
        <span key={s} className="flex items-center gap-1">
          <span
            className={cn(
              "rounded px-1.5 py-0.5",
              index === activeIndex ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {s}
          </span>
          {index < PIPELINE_STAGES.length - 1 && <ChevronRight className="size-3 text-muted-foreground" />}
        </span>
      ))}
    </div>
  );
}
