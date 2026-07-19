import { Table2 } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { cn } from "@/lib/utils/cn";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import type { TableRef } from "@/features/paper-viewer/types";

interface TableListProps {
  tables: TableRef[];
  activeIndex: number | null;
  onSelect: (table: TableRef) => void;
}

export function TableList({ tables, activeIndex, onSelect }: TableListProps) {
  if (tables.length === 0) {
    return <EmptyState icon={Table2} title="No tables detected" description="The parser didn't find any table captions." />;
  }

  return (
    <VirtualizedList
      items={tables}
      estimateSize={68}
      className="max-h-[420px] overflow-y-auto"
      getKey={(table) => `${table.page_number}-${table.index}`}
      renderItem={(table, index) => (
        <button
          type="button"
          onClick={() => onSelect(table)}
          className={cn(
            "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50",
            index === activeIndex && "bg-accent",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
            <Table2 className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{table.caption ?? `Table ${index + 1}`}</span>
            <span className="block text-xs text-muted-foreground">Page {table.page_number}</span>
          </span>
        </button>
      )}
    />
  );
}
