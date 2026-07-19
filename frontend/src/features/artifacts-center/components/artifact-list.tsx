import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatBytes, formatDate } from "@/lib/utils/formatters";
import { CATEGORY_CONFIG } from "@/features/artifacts-center/lib/category-config";
import type { UnifiedArtifact } from "@/features/artifacts-center/types";

interface ArtifactListProps {
  artifacts: UnifiedArtifact[];
  selectedId: string | null;
  onSelect: (artifact: UnifiedArtifact) => void;
}

/** Table view of ArtifactBrowser - icon/filename/type/size/created/version/owner/stage, per the spec's display columns. */
export function ArtifactList({ artifacts, selectedId, onSelect }: ArtifactListProps) {
  const columns: DataTableColumn<UnifiedArtifact>[] = [
    {
      id: "name",
      header: "Name",
      cell: (artifact) => {
        const Icon = CATEGORY_CONFIG[artifact.category].icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{artifact.fileName}</span>
          </div>
        );
      },
    },
    { id: "type", header: "Type", cell: (a) => <Badge variant="outline">{a.typeLabel}</Badge> },
    { id: "size", header: "Size", cell: (a) => (a.sizeBytes !== null ? formatBytes(a.sizeBytes) : "—") },
    { id: "created", header: "Created", cell: (a) => formatDate(a.createdAt) },
    { id: "version", header: "Version", cell: (a) => (a.version !== null ? `v${a.version}` : "—") },
    { id: "owner", header: "Owner", cell: (a) => a.owner ?? "—" },
    { id: "stage", header: "Stage", cell: (a) => a.stage },
  ];

  return (
    <DataTable
      columns={columns}
      data={artifacts}
      getRowId={(a) => a.id}
      onRowClick={onSelect}
      rowClassName={(a) => cn(a.id === selectedId && "bg-accent")}
      emptyTitle="No artifacts match"
      emptyDescription="Try loosening your search or filters."
    />
  );
}
