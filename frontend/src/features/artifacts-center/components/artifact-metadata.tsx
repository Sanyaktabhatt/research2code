import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { formatBytes, formatDateTime } from "@/lib/utils/formatters";
import { CATEGORY_CONFIG } from "@/features/artifacts-center/lib/category-config";
import { PipelineStageTrail } from "@/features/artifacts-center/components/pipeline-stage-trail";
import type { UnifiedArtifact } from "@/features/artifacts-center/types";

interface FieldProps {
  label: string;
  value: React.ReactNode;
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="min-w-0">
      <p className="section-label">{label}</p>
      <div className="mt-0.5 truncate text-sm">{value}</div>
    </div>
  );
}

interface ArtifactMetadataProps {
  artifact: UnifiedArtifact;
}

export function ArtifactMetadata({ artifact }: ArtifactMetadataProps) {
  const Icon = CATEGORY_CONFIG[artifact.category].icon;

  return (
    <SectionCard title="Metadata">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{artifact.fileName}</p>
            <p className="text-xs text-muted-foreground">{CATEGORY_CONFIG[artifact.category].label}</p>
          </div>
        </div>

        <PipelineStageTrail stage={artifact.stage} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" value={<Badge variant="outline">{artifact.typeLabel}</Badge>} />
          <Field label="Size" value={artifact.sizeBytes !== null ? formatBytes(artifact.sizeBytes) : "Unknown"} />
          <Field label="Created" value={formatDateTime(artifact.createdAt)} />
          <Field label="Version" value={artifact.version !== null ? `v${artifact.version}` : "—"} />
          <Field label="Owner" value={artifact.owner ?? "—"} />
          <Field label="Source" value={artifact.generationSource} />
        </div>

        {(artifact.relatedPaper || artifact.relatedGeneratedProject || artifact.relatedExecution) && (
          <div className="space-y-1 border-t border-border pt-3">
            {artifact.relatedPaper && <Field label="Paper" value={artifact.relatedPaper} />}
            {artifact.relatedGeneratedProject && <Field label="Generated project" value={artifact.relatedGeneratedProject} />}
            {artifact.relatedExecution && <Field label="Execution run" value={artifact.relatedExecution} />}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
