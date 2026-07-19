"use client";

import { useQuery } from "@tanstack/react-query";
import { listPapersForProject, getPaper } from "@/lib/api/endpoints/papers";
import { getLatestKnowledgeExtraction } from "@/lib/api/endpoints/knowledge";
import { queryKeys } from "@/lib/query/keys";
import type { ExtractedKnowledgeData, ParsedPaper } from "@/features/paper-viewer/types";

/**
 * The project's most recently uploaded paper drives this view - same
 * "one primary paper per project" convention the pipeline tracker and
 * activity timeline already use, since the backend has no separate
 * "primary paper" concept.
 */
export function usePaperViewerData(projectId: string) {
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

  const knowledgeQuery = useQuery({
    queryKey: queryKeys.knowledge.latest(paperId ?? ""),
    queryFn: () => getLatestKnowledgeExtraction(paperId as string),
    enabled: Boolean(paperId) && paperDetailQuery.data?.status === "completed",
  });

  const paper = paperDetailQuery.data;
  const parsedPaper = (paper?.parsed_data as ParsedPaper | null) ?? null;
  const extractedKnowledge = (knowledgeQuery.data?.extracted_data as ExtractedKnowledgeData | null) ?? null;

  return {
    isLoading: papersQuery.isLoading || (Boolean(paperId) && paperDetailQuery.isLoading),
    isError: papersQuery.isError || paperDetailQuery.isError,
    error: papersQuery.error ?? paperDetailQuery.error,
    hasPaper: Boolean(paperId),
    paper,
    parsedPaper,
    knowledge: knowledgeQuery.data,
    extractedKnowledge,
  };
}
