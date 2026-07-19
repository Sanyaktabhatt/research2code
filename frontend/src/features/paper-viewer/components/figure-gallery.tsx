import { Image as ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { cn } from "@/lib/utils/cn";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import type { FigureRef } from "@/features/paper-viewer/types";

interface FigureGalleryProps {
  figures: FigureRef[];
  activeIndex: number | null;
  onSelect: (figure: FigureRef) => void;
}

/**
 * No figure image is ever available - the parser only records each
 * figure's page/bbox/caption, never a rendered crop (see
 * app/parser/figure_extractor.py) - so each card shows a generic
 * placeholder icon rather than a fabricated thumbnail.
 */
export function FigureGallery({ figures, activeIndex, onSelect }: FigureGalleryProps) {
  if (figures.length === 0) {
    return <EmptyState icon={ImageIcon} title="No figures detected" description="The parser didn't find any embedded images." />;
  }

  return (
    <VirtualizedList
      items={figures}
      estimateSize={84}
      className="max-h-[420px] overflow-y-auto"
      getKey={(figure) => `${figure.page_number}-${figure.index}`}
      renderItem={(figure, index) => (
        <button
          type="button"
          onClick={() => onSelect(figure)}
          className={cn(
            "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50",
            index === activeIndex && "bg-accent",
          )}
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted text-muted-foreground">
            <ImageIcon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Figure {index + 1}</span>
            <span className="block truncate text-xs text-muted-foreground">{figure.caption ?? "No caption"}</span>
            <span className="block text-xs text-muted-foreground">Page {figure.page_number}</span>
          </span>
        </button>
      )}
    />
  );
}
