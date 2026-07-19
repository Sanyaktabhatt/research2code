import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfidenceBadge } from "@/features/knowledge-explorer/components/confidence-badge";
import { ConfidenceBar } from "@/features/knowledge-explorer/components/confidence-bar";
import { cn } from "@/lib/utils/cn";
import type { EntitySource, NormalizedEntity } from "@/features/knowledge-explorer/types";

const DIFF_LABEL: Record<NonNullable<NormalizedEntity["diffStatus"]>, string> = {
  added: "Added",
  removed: "Removed",
  modified: "Modified",
  unchanged: "",
};

const DIFF_BORDER: Record<NonNullable<NormalizedEntity["diffStatus"]>, string> = {
  added: "border-l-4 border-l-success",
  removed: "border-l-4 border-l-destructive",
  modified: "border-l-4 border-l-warning",
  unchanged: "",
};

interface KnowledgeEntityCardProps {
  entity: NormalizedEntity;
  source: EntitySource;
  isActive: boolean;
  onSelect: (entity: NormalizedEntity) => void;
  /** Jumps to the originating page/section in the Paper Viewer - a distinct action from selecting the card. */
  onOpenInPaper?: (entity: NormalizedEntity) => void;
}

export function KnowledgeEntityCard({ entity, source, isActive, onSelect, onOpenInPaper }: KnowledgeEntityCardProps) {
  const isRemoved = entity.diffStatus === "removed";

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-md border border-border bg-card px-3 py-2 transition-colors",
        !isRemoved && "hover:bg-muted/50",
        isActive && "ring-2 ring-primary",
        entity.diffStatus && entity.diffStatus !== "unchanged" && DIFF_BORDER[entity.diffStatus],
        isRemoved && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={() => !isRemoved && onSelect(entity)}
        disabled={isRemoved}
        className={cn("flex w-full flex-col gap-1.5 text-left", isRemoved && "cursor-not-allowed")}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", isRemoved && "line-through")}>{entity.name}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            {entity.diffStatus && entity.diffStatus !== "unchanged" && (
              <Badge variant={entity.diffStatus === "added" ? "success" : entity.diffStatus === "removed" ? "destructive" : "warning"}>
                {DIFF_LABEL[entity.diffStatus]}
              </Badge>
            )}
            <ConfidenceBadge confidence={entity.confidence} />
          </div>
        </div>

        <ConfidenceBar confidence={entity.confidence} />
      </button>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {source.sectionLabel && <span>{source.sectionLabel}</span>}
          {source.pageNumber !== null && <span>Page {source.pageNumber}</span>}
          <span>v{entity.extractionVersion}</span>
        </div>

        {onOpenInPaper && source.pageNumber !== null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInPaper(entity);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Open in Paper Viewer"
              >
                <FileText className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Open in Paper Viewer</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
