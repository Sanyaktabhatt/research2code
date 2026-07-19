import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatBytes, formatDate } from "@/lib/utils/formatters";
import { CATEGORY_CONFIG } from "@/features/artifacts-center/lib/category-config";
import type { UnifiedArtifact } from "@/features/artifacts-center/types";

interface ArtifactCardProps {
  artifact: UnifiedArtifact;
  isSelected: boolean;
  onSelect: () => void;
}

export function ArtifactCard({ artifact, isSelected, onSelect }: ArtifactCardProps) {
  const Icon = CATEGORY_CONFIG[artifact.category].icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all duration-200",
        isSelected
          ? "border-primary/50 bg-gradient-brand-soft shadow-glow"
          : "border-border hover:-translate-y-0.5 hover:border-border-strong hover:bg-muted/50 hover:shadow-md",
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-md bg-gradient-brand-soft text-primary transition-transform duration-200 group-hover:scale-110">
        <Icon className="size-4.5" />
      </div>
      <p className="w-full truncate text-sm font-medium" title={artifact.fileName}>
        {artifact.fileName}
      </p>
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px]">
          {artifact.typeLabel}
        </Badge>
        {artifact.version !== null && (
          <Badge variant="secondary" className="text-[10px]">
            v{artifact.version}
          </Badge>
        )}
      </div>
      <div className="w-full space-y-0.5 text-xs text-muted-foreground">
        <p className="truncate">{artifact.sizeBytes !== null ? formatBytes(artifact.sizeBytes) : "Size unknown"}</p>
        <p className="truncate">{formatDate(artifact.createdAt)}</p>
        <p className="truncate">{artifact.stage}</p>
      </div>
    </button>
  );
}
