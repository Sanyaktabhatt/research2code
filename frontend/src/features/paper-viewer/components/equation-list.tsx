import { Sigma } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { cn } from "@/lib/utils/cn";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import type { EquationRef } from "@/features/paper-viewer/types";

interface EquationListProps {
  equations: EquationRef[];
  activeIndex: number | null;
  onSelect: (equation: EquationRef) => void;
}

export function EquationList({ equations, activeIndex, onSelect }: EquationListProps) {
  if (equations.length === 0) {
    return <EmptyState icon={Sigma} title="No equations detected" description="The parser didn't find any standalone equation lines." />;
  }

  return (
    <VirtualizedList
      items={equations}
      estimateSize={64}
      className="max-h-[420px] overflow-y-auto"
      getKey={(equation) => `${equation.page_number}-${equation.index}`}
      renderItem={(equation, index) => (
        <button
          type="button"
          onClick={() => onSelect(equation)}
          className={cn(
            "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50",
            index === activeIndex && "bg-accent",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
            <Sigma className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <code className="block truncate text-xs">{equation.text}</code>
            <span className="block text-xs text-muted-foreground">Page {equation.page_number}</span>
          </span>
        </button>
      )}
    />
  );
}
