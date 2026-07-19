"use client";

import { useQuery } from "@tanstack/react-query";
import { listPapersForProject, getPaper } from "@/lib/api/endpoints/papers";
import { getKnowledgeExtractionVersion, listKnowledgeExtractions } from "@/lib/api/endpoints/knowledge";
import { queryKeys } from "@/lib/query/keys";
import type { ExtractedKnowledgeData, ParsedPaper } from "@/features/paper-viewer/types";

export function useKnowledgeExplorerData(projectId: string, selectedVersion: number | null, compareVersion: number | null) {
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

  const extractionsQuery = useQuery({
    queryKey: queryKeys.knowledge.list(paperId ?? ""),
    queryFn: () => listKnowledgeExtractions(paperId as string),
    enabled: Boolean(paperId),
  });

  const selectedQuery = useQuery({
    queryKey: queryKeys.knowledge.version(paperId ?? "", selectedVersion ?? 0),
    queryFn: () => getKnowledgeExtractionVersion(paperId as string, selectedVersion as number),
    enabled: Boolean(paperId) && selectedVersion !== null,
  });

  const compareQuery = useQuery({
    queryKey: queryKeys.knowledge.version(paperId ?? "", compareVersion ?? 0),
    queryFn: () => getKnowledgeExtractionVersion(paperId as string, compareVersion as number),
    enabled: Boolean(paperId) && compareVersion !== null,
  });

  const parsedPaper = (paperDetailQuery.data?.parsed_data as ParsedPaper | null) ?? null;
  const selectedExtracted = (selectedQuery.data?.extracted_data as ExtractedKnowledgeData | null) ?? null;
  const compareExtracted = (compareQuery.data?.extracted_data as ExtractedKnowledgeData | null) ?? null;

  return {
    isLoading: papersQuery.isLoading || (Boolean(paperId) && (paperDetailQuery.isLoading || extractionsQuery.isLoading)),
    isError: papersQuery.isError || paperDetailQuery.isError || extractionsQuery.isError,
    hasPaper: Boolean(paperId),
    paperId,
    paperStatus: paperDetailQuery.data?.status,
    parsedPaper,
    extractions: extractionsQuery.data ?? [],
    selectedExtraction: selectedQuery.data,
    selectedExtracted,
    compareExtraction: compareQuery.data,
    compareExtracted,
    isSelectedLoading: selectedQuery.isLoading,
    isCompareLoading: compareQuery.isLoading,
  };
}
