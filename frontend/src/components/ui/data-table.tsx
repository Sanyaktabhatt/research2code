import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/feedback/skeletons";
import { EmptyState } from "@/components/feedback/empty-state";
import { cn } from "@/lib/utils/cn";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  onRowClick,
  rowClassName,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border shadow-xs", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.id} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={getRowId(row)}
              className={cn(onRowClick && "cursor-pointer", rowClassName?.(row))}
              onClick={(event) => {
                // A cell's own `<a>`/`<button>` (e.g. the row's primary link)
                // already handles its own click and shouldn't also trigger
                // a second, redundant `onRowClick` navigation bubbling up
                // from the same click.
                if ((event.target as HTMLElement).closest("a, button")) return;
                onRowClick?.(row);
              }}
            >
              {columns.map((col) => (
                <TableCell key={col.id} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
