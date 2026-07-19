"use client";

import { useQuery } from "@tanstack/react-query";
import { getPaper, listPapersForProject } from "@/lib/api/endpoints/papers";
import { getPaperGraph } from "@/lib/api/endpoints/graph";
import { queryKeys } from "@/lib/query/keys";
import type { ParsedPaper } from "@/features/paper-viewer/types";

/**
 * The project's most recently uploaded paper drives this view - same
 * "one primary paper per project" convention `usePaperViewerData` and the
 * pipeline tracker use, since the backend graph endpoint is per-paper
 * (GET /papers/{paper_id}/graph) with no project-level aggregate.
 */
export function useGraphExplorerData(projectId: string) {
  const papersQuery = useQuery({
    queryKey: queryKeys.papers.list(projectId),
    queryFn: () => listPapersForProject(projectId),
  });

  const paperId = papersQuery.data?.[0]?.id;

  const paperDetailQuery = useQuery({
    queryKey: queryKeys.papers.detail(projectId, paperId ?? ""),
    queryFn: () => getPaper(projectId, paperId as string),
    enabled: Boolean(paperId),
  });

  const graphQuery = useQuery({
    queryKey: queryKeys.graph.snapshot(paperId ?? ""),
    queryFn: () => getPaperGraph(paperId as string),
    enabled: Boolean(paperId) && paperDetailQuery.data?.status === "completed",
  });

  const paper = paperDetailQuery.data;
  const parsedPaper = (paper?.parsed_data as ParsedPaper | null) ?? null;

  return {
    isLoading: papersQuery.isLoading || (Boolean(paperId) && paperDetailQuery.isLoading),
    isError: papersQuery.isError || paperDetailQuery.isError || graphQuery.isError,
    hasPaper: Boolean(paperId),
    paperId: paperId ?? null,
    paperStatus: paper?.status ?? null,
    parsedPaper,
    isGraphLoading: Boolean(paperId) && paperDetailQuery.data?.status === "completed" && graphQuery.isLoading,
    graph: graphQuery.data ?? null,
  };
}
