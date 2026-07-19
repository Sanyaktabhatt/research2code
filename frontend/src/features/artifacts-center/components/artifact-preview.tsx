import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { MarkdownRenderer } from "@/features/ai-assistant/components/markdown-renderer";
import { LogViewer } from "@/features/experiments/components/log-viewer";
import type { ArtifactPreviewResult } from "@/features/artifacts-center/api/use-artifact-preview";
import type { UnifiedArtifact } from "@/features/artifacts-center/types";

interface ArtifactPreviewProps {
  artifact: UnifiedArtifact | null;
  preview: ArtifactPreviewResult;
}

/**
 * Dispatches on `previewKind`, reusing the same renderers the rest of the
 * app already has (LogViewer for logs, MarkdownRenderer for markdown) so
 * this never re-implements text/code rendering. Only json/text/log/none
 * ever actually occur with today's data (no endpoint serves a paper's raw
 * PDF or any image asset) - pdf/markdown/image/yaml are still handled here
 * so the component is correct if/when a source for them exists.
 */
export function ArtifactPreview({ artifact, preview }: ArtifactPreviewProps) {
  if (!artifact) {
    return <EmptyState icon={FileQuestion} title="No artifact selected" description="Choose an artifact from the browser to preview it." />;
  }

  if (preview.isLoading) return <CardSkeleton className="h-full" />;
  if (preview.isError) return <EmptyState title="Couldn't load preview" description="Something went wrong fetching this artifact's content." />;

  switch (artifact.previewKind) {
    case "log":
      return (
        <div className="h-full">
          <LogViewer lines={Array.isArray(preview.content) ? (preview.content as string[]) : []} isLive={false} downloadUrl={null} />
        </div>
      );

    case "markdown":
      return (
        <div className="h-full overflow-y-auto rounded-lg border border-border p-4">
          <MarkdownRenderer content={typeof preview.content === "string" ? preview.content : ""} />
        </div>
      );

    case "pdf":
      return typeof preview.content === "string" ? (
        <iframe src={preview.content} title={artifact.fileName} className="h-full w-full rounded-lg border border-border" />
      ) : (
        <EmptyState title="No preview available." />
      );

    case "image":
      return typeof preview.content === "string" ? (
        // eslint-disable-next-line @next/next/no-img-element -- previewed URL is a short-lived presigned link, not worth Next's image optimizer
        <img src={preview.content} alt={artifact.fileName} className="max-h-full max-w-full rounded-lg border border-border object-contain" />
      ) : (
        <EmptyState title="No preview available." />
      );

    case "json":
    case "yaml":
    case "text":
      return (
        <pre className="h-full overflow-auto rounded-lg border border-border bg-muted p-4 font-mono text-xs">
          {typeof preview.content === "string" ? preview.content : JSON.stringify(preview.content, null, 2)}
        </pre>
      );

    case "none":
    default:
      return <EmptyState title="No preview available." description={artifact.downloadHint ?? undefined} />;
  }
}
