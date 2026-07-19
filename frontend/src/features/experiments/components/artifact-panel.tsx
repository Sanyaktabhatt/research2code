import { Download, FileArchive, FileImage, FileText, Package, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { downloadFromUrl } from "@/features/generated-project/lib/download-file";
import { groupArtifacts, type ArtifactCategory } from "@/features/experiments/lib/group-artifacts";
import type { ExecutionRunDetail } from "@/types/domain";

const CATEGORY_LABELS: Record<ArtifactCategory, string> = {
  checkpoint: "Checkpoints",
  exported_model: "Exported models",
  tensorboard: "TensorBoard logs",
  plot: "Plots",
  other: "Other artifacts",
};

const CATEGORY_ICONS: Record<ArtifactCategory, typeof Package> = {
  checkpoint: Package,
  exported_model: FileArchive,
  tensorboard: ScrollText,
  plot: FileImage,
  other: FileText,
};

interface ArtifactPanelProps {
  run: ExecutionRunDetail;
  logDownloadUrl: string | null;
}

/**
 * Only "execution logs" has a real per-file download endpoint (see
 * backend/app/api/v1/endpoints/execution.py::download_execution_logs) -
 * checkpoints/exported models/plots are only ever exposed as a flat path
 * list (`artifact_manifest`), with no per-artifact download endpoint, so
 * those are listed for visibility without a (fake) download action.
 */
export function ArtifactPanel({ run, logDownloadUrl }: ArtifactPanelProps) {
  const groups = groupArtifacts(run.artifact_manifest ?? []);
  const hasAnyArtifacts = Object.values(groups).some((entries) => entries.length > 0);

  return (
    <SectionCard title="Artifacts" description="Downloadable outputs from this execution">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-md border border-border p-2.5">
          <div className="flex items-center gap-2 text-sm">
            <ScrollText className="size-4 text-muted-foreground" />
            Execution logs
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!logDownloadUrl} onClick={() => logDownloadUrl && downloadFromUrl("execution-run.log", logDownloadUrl)}>
            <Download className="size-3.5" />
            Download
          </Button>
        </div>

        {!hasAnyArtifacts ? (
          <EmptyState title="No other artifacts yet" description="Checkpoints and exported models appear here once the run produces them." />
        ) : (
          (Object.keys(groups) as ArtifactCategory[])
            .filter((category) => groups[category].length > 0)
            .map((category) => {
              const Icon = CATEGORY_ICONS[category];
              return (
                <div key={category}>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Icon className="size-3.5" />
                    {CATEGORY_LABELS[category]} ({groups[category].length})
                  </p>
                  <div className="space-y-1">
                    {groups[category].map((entry) => (
                      <div key={entry.path} className="truncate rounded-md border border-border px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
                        {entry.path}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </SectionCard>
  );
}
