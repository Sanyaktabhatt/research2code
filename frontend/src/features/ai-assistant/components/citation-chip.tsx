import { FileText, Sparkles, Image as ImageIcon, Table as TableIcon, Sigma } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { citationLabel, SOURCE_TYPE_LABELS } from "@/features/ai-assistant/lib/citation-labels";
import type { Citation, EmbeddingSourceType } from "@/types/domain";

const SOURCE_TYPE_ICONS: Record<EmbeddingSourceType, typeof FileText> = {
  section: FileText,
  knowledge_entity: Sparkles,
  figure_caption: ImageIcon,
  table_description: TableIcon,
  equation_description: Sigma,
};

interface CitationChipProps {
  citation: Citation;
  onOpen: (citation: Citation) => void;
  /** "inline" - a tight `[N]` badge inside message prose. "list" - a fuller row in a message's citation footer. */
  variant?: "inline" | "list";
}

export function CitationChip({ citation, onOpen, variant = "inline" }: CitationChipProps) {
  const Icon = SOURCE_TYPE_ICONS[citation.source_type];
  const canNavigate = citation.page_number !== null;

  if (variant === "inline") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onOpen(citation)}
            disabled={!canNavigate}
            className="mx-0.5 inline-flex size-4 -translate-y-0.5 items-center justify-center rounded bg-gradient-brand-soft align-super text-[10px] font-semibold text-primary transition-transform hover:scale-110 hover:shadow-glow disabled:cursor-default disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {citation.index}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          <p className="font-medium">{citationLabel(citation)}</p>
          <p className="text-primary-foreground/70">
            {SOURCE_TYPE_LABELS[citation.source_type]}
            {citation.page_number !== null && ` · page ${citation.page_number}`} · {Math.round(citation.score * 100)}% match
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(citation)}
      disabled={!canNavigate}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-left text-xs transition-colors",
        canNavigate ? "hover:border-primary/50 hover:bg-accent" : "cursor-default opacity-70",
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/15 text-[10px] font-semibold text-primary">
        {citation.index}
      </span>
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{citationLabel(citation)}</span>
      {citation.page_number !== null && <span className="shrink-0 text-muted-foreground">p.{citation.page_number}</span>}
      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
        {Math.round(citation.score * 100)}%
      </span>
    </button>
  );
}
