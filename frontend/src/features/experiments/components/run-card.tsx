import { Cpu, Layers, RotateCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StageBadge } from "@/components/ui/stage-badge";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatDuration } from "@/lib/utils/formatters";
import { executionRunStatusToStage } from "@/lib/utils/status-mapping";
import type { EnrichedRun } from "@/features/experiments/types";

interface RunCardProps {
  run: EnrichedRun;
  isSelected: boolean;
  isComparing: boolean;
  onSelect: () => void;
  onToggleCompare: (checked: boolean) => void;
}

export function RunCard({ run, isSelected, isComparing, onSelect, onToggleCompare }: RunCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card p-3 text-left transition-[border-color,background-color,box-shadow] duration-150",
        isSelected ? "border-info bg-info/[0.05] ring-1 ring-info" : "border-border hover:border-border-strong hover:bg-accent/40",
      )}
    >
      <Checkbox
        checked={isComparing}
        onCheckedChange={(checked) => onToggleCompare(checked === true)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select run v${run.version} for comparison`}
        className="mt-1"
      />
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Run v{run.version}</span>
          <StageBadge status={executionRunStatusToStage(run.status)} label={run.status} />
          {run.retryCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <RotateCw className="size-3" />
              Retry {run.retryCount}
            </Badge>
          )}
          {run.exit_code !== null && run.exit_code !== 0 && <Badge variant="destructive">Exit {run.exit_code}</Badge>}
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="truncate">Started {run.started_at ? formatDateTime(run.started_at) : "—"}</span>
          <span className="truncate">Duration {run.durationSeconds !== null ? formatDuration(run.durationSeconds) : "—"}</span>
          <span className="flex min-w-0 items-center gap-1 truncate">
            <Layers className="size-3 shrink-0" />
            <span className="truncate">
              Project v{run.generatedProjectVersion}
              {run.knowledgeExtractionVersion !== null && ` · KE v${run.knowledgeExtractionVersion}`}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-1 truncate">
            <Cpu className="size-3 shrink-0" />
            <span className="truncate">
              {run.device.toUpperCase()} · {run.execution_backend}
            </span>
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5">
          <Sparkles className="size-3 text-muted-foreground" />
          <Badge variant="outline" className="text-[10px]">
            {run.framework}
          </Badge>
        </div>
      </button>
    </div>
  );
}
