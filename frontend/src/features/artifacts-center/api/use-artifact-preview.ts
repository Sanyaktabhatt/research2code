"use client";

import { useQuery } from "@tanstack/react-query";
import { getKnowledgeExtractionVersion } from "@/lib/api/endpoints/knowledge";
import { getExecutionRunLogDownloadUrl } from "@/lib/api/endpoints/execution-runs";
import { queryKeys } from "@/lib/query/keys";
import { useLogText } from "@/features/experiments/api/use-log-text";
import type { UnifiedArtifact } from "@/features/artifacts-center/types";

export interface ArtifactPreviewResult {
  isLoading: boolean;
  isError: boolean;
  /** JSON-able payload for json/yaml previews, or a string/string[] for text/log previews. */
  content: unknown;
}

/**
 * Most artifacts already carry their preview payload (`inlinePreview`) from
 * the aggregation pass - only knowledge-extraction detail (not in the list
 * response) and execution logs (need a presigned URL first) require a
 * fetch on selection.
 */
export function useArtifactPreview(artifact: UnifiedArtifact | null): ArtifactPreviewResult {
  const needsExtractionDetail = artifact?.category === "knowledge_extraction" && artifact.source.paperId && artifact.source.knowledgeExtractionVersion;
  const extractionQuery = useQuery({
    queryKey: queryKeys.knowledge.version(artifact?.source.paperId ?? "", artifact?.source.knowledgeExtractionVersion ?? 0),
    queryFn: () => getKnowledgeExtractionVersion(artifact!.source.paperId as string, artifact!.source.knowledgeExtractionVersion as number),
    enabled: Boolean(needsExtractionDetail),
  });

  const needsLogUrl = artifact?.category === "execution_log" && artifact.source.executionRunId;
  const logUrlQuery = useQuery({
    queryKey: queryKeys.executionRuns.logDownloadUrl(artifact?.source.executionRunId ?? ""),
    queryFn: () => getExecutionRunLogDownloadUrl(artifact!.source.executionRunId as string),
    enabled: Boolean(needsLogUrl),
  });
  const logText = useLogText(needsLogUrl ? (logUrlQuery.data?.url ?? null) : null);

  if (!artifact) return { isLoading: false, isError: false, content: null };

  if (needsExtractionDetail) {
    return { isLoading: extractionQuery.isLoading, isError: extractionQuery.isError, content: extractionQuery.data?.extracted_data ?? null };
  }

  if (needsLogUrl) {
    return { isLoading: logUrlQuery.isLoading || logText.isLoading, isError: logUrlQuery.isError || logText.isError, content: logText.lines };
  }

  return { isLoading: false, isError: false, content: artifact.inlinePreview };
}
