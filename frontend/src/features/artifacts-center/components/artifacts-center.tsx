"use client";

import * as React from "react";
import { Archive, Download, FileWarning, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { useWorkspaceInspectorStore } from "@/stores/workspace-inspector-store";
import { useAllArtifacts } from "@/features/artifacts-center/api/use-all-artifacts";
import { useArtifactPreview } from "@/features/artifacts-center/api/use-artifact-preview";
import { ArtifactBrowser } from "@/features/artifacts-center/components/artifact-browser";
import { ArtifactPreview } from "@/features/artifacts-center/components/artifact-preview";
import { ArtifactMetadata } from "@/features/artifacts-center/components/artifact-metadata";
import { VersionHistory } from "@/features/artifacts-center/components/version-history";
import { StorageSummary } from "@/features/artifacts-center/components/storage-summary";
import { CATEGORY_CONFIG } from "@/features/artifacts-center/lib/category-config";
import { buildStorageSummary } from "@/features/artifacts-center/lib/storage-summary";
import { findVersionSiblings } from "@/features/artifacts-center/lib/find-version-siblings";
import { canDownload, downloadArtifact } from "@/features/artifacts-center/lib/download-artifact";
import type { UnifiedArtifact } from "@/features/artifacts-center/types";

interface ArtifactsCenterProps {
  projectId: string;
}

/** Feature root for the Artifacts Center: aggregates every real pipeline resource into one browsable, searchable, previewable artifact list. */
export function ArtifactsCenter({ projectId }: ArtifactsCenterProps) {
  const setInspectorSelection = useWorkspaceInspectorStore((s) => s.setSelection);
  const data = useAllArtifacts(projectId);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = data.artifacts.find((a) => a.id === selectedId) ?? null;

  const preview = useArtifactPreview(selected);
  const storageSummary = React.useMemo(() => buildStorageSummary(data.artifacts), [data.artifacts]);
  const siblings = React.useMemo(() => (selected ? findVersionSiblings(data.artifacts, selected) : []), [data.artifacts, selected]);

  const handleSelect = (artifact: UnifiedArtifact) => {
    setSelectedId(artifact.id);
    setInspectorSelection({
      tab: "artifacts",
      fileName: artifact.fileName,
      sizeBytes: artifact.sizeBytes,
      contentType: artifact.contentType,
      category: CATEGORY_CONFIG[artifact.category].label,
      pipelineStage: artifact.stage,
      version: artifact.version,
      createdAt: artifact.createdAt,
      relatedProject: data.projectName,
      relatedPaper: artifact.relatedPaper,
      relatedExecution: artifact.relatedExecution,
      generationSource: artifact.generationSource,
    });
  };

  const handleDownload = (artifact: UnifiedArtifact) => void downloadArtifact(artifact);

  if (data.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton className="sm:col-span-2" />
      </div>
    );
  }

  if (data.isError) {
    return <EmptyState icon={FileWarning} title="Couldn't load artifacts" description="Something went wrong fetching this project's artifacts." />;
  }

  if (!data.hasPapers) {
    return <EmptyState icon={UploadCloud} title="No artifacts yet" description="Upload a paper to start generating artifacts through the pipeline." />;
  }

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[640px] flex-col gap-3">
      <StorageSummary summary={storageSummary} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <div className="max-h-80 min-h-0 shrink-0 rounded-xl border border-border bg-muted/20 p-3 lg:h-full lg:max-h-none lg:w-72">
          <ArtifactBrowser artifacts={data.artifacts} selectedId={selectedId} onSelect={handleSelect} />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
          {!selected ? (
            <EmptyState icon={Archive} title="Select an artifact" description="Choose an artifact from the browser to preview and inspect it." />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{selected.fileName}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  disabled={!canDownload(selected)}
                  onClick={() => handleDownload(selected)}
                  title={!canDownload(selected) ? (selected.downloadHint ?? undefined) : undefined}
                >
                  <Download className="size-3.5" />
                  Download
                </Button>
              </div>

              <div className="h-72 shrink-0 lg:h-96">
                <ArtifactPreview artifact={selected} preview={preview} />
              </div>

              <ArtifactMetadata artifact={selected} />

              {selected.version !== null && <VersionHistory siblings={siblings} selectedId={selected.id} onSelect={handleSelect} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
