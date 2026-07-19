import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/formatters";
import type { UnifiedArtifact } from "@/features/artifacts-center/types";

interface VersionHistoryProps {
  siblings: UnifiedArtifact[];
  selectedId: string;
  onSelect: (artifact: UnifiedArtifact) => void;
}

export function VersionHistory({ siblings, selectedId, onSelect }: VersionHistoryProps) {
  if (siblings.length <= 1) {
    return (
      <SectionCard title="Version history">
        <EmptyState title="Only one version" description="No other versions exist for this artifact yet." />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Version history" description="Every version of this artifact for the same paper/project">
      <div className="space-y-1.5">
        {siblings.map((version) => (
          <button
            key={version.id}
            type="button"
            onClick={() => onSelect(version)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left text-sm transition-colors",
              version.id === selectedId ? "border-primary/50 bg-accent" : "hover:bg-muted/50",
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">v{version.version}</span>
                {version.id === selectedId && <Badge variant="secondary">Current</Badge>}
              </div>
              <p className="truncate text-xs text-muted-foreground">{formatDateTime(version.createdAt)}</p>
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <p>{version.owner ?? "Automated pipeline"}</p>
              {version.relatedExecution && <p className="truncate">{version.relatedExecution}</p>}
              {!version.relatedExecution && version.relatedGeneratedProject && <p className="truncate">{version.relatedGeneratedProject}</p>}
            </div>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
