"use client";

import { useQuery } from "@tanstack/react-query";
import { getPaper, listPapersForProject } from "@/lib/api/endpoints/papers";
import { getKnowledgeExtractionVersion, listKnowledgeExtractions } from "@/lib/api/endpoints/knowledge";
import {
  getGeneratedProjectDownloadUrl,
  getGeneratedProjectVersion,
  listGeneratedProjectsForPaper,
} from "@/lib/api/endpoints/generated-projects";
import { queryKeys } from "@/lib/query/keys";
import { fetchAndUnzipProject } from "@/features/generated-project/lib/unzip-project";
import type { ExtractedKnowledgeData, ParsedPaper } from "@/features/paper-viewer/types";

/**
 * "One primary paper per project" convention (see usePaperViewerData) -
 * every generation version listed here belongs to that paper. `version`
 * is caller-controlled (GenerationSelector) so switching versions never
 * refetches the paper/version list, only the one detail query.
 */
export function useGeneratedProjectData(projectId: string, version: number | null) {
  const papersQuery = useQuery({
    queryKey: queryKeys.papers.list(projectId),
    queryFn: () => listPapersForProject(projectId),
  });
  const paperId = papersQuery.data?.[0]?.id ?? null;

  const paperDetailQuery = useQuery({
    queryKey: queryKeys.papers.detail(projectId, paperId ?? ""),
    queryFn: () => getPaper(projectId, paperId as string),
    enabled: Boolean(paperId),
  });
  const parsedPaper = (paperDetailQuery.data?.parsed_data as ParsedPaper | null) ?? null;

  const versionsQuery = useQuery({
    queryKey: queryKeys.codegen.forPaper(paperId ?? ""),
    queryFn: () => listGeneratedProjectsForPaper(paperId as string),
    enabled: Boolean(paperId),
  });
  const versions = versionsQuery.data ?? [];
  const latestVersion = versions[0]?.version ?? null;
  const resolvedVersion = version ?? latestVersion;

  const detailQuery = useQuery({
    queryKey: queryKeys.codegen.version(paperId ?? "", resolvedVersion ?? 0),
    queryFn: () => getGeneratedProjectVersion(paperId as string, resolvedVersion as number),
    enabled: Boolean(paperId) && resolvedVersion !== null,
  });
  const project = detailQuery.data ?? null;

  const extractionsQuery = useQuery({
    queryKey: queryKeys.knowledge.list(paperId ?? ""),
    queryFn: () => listKnowledgeExtractions(paperId as string),
    enabled: Boolean(paperId) && Boolean(project),
  });
  const extractionVersion = extractionsQuery.data?.find((e) => e.id === project?.knowledge_extraction_id)?.version ?? null;

  const extractionDetailQuery = useQuery({
    queryKey: queryKeys.knowledge.version(paperId ?? "", extractionVersion ?? 0),
    queryFn: () => getKnowledgeExtractionVersion(paperId as string, extractionVersion as number),
    enabled: Boolean(paperId) && extractionVersion !== null,
  });
  const extractedKnowledge = (extractionDetailQuery.data?.extracted_data as ExtractedKnowledgeData | null) ?? null;

  const downloadUrlQuery = useQuery({
    queryKey: queryKeys.codegen.downloadUrl(project?.id ?? ""),
    queryFn: () => getGeneratedProjectDownloadUrl(project!.id),
    enabled: Boolean(project) && project?.status === "completed",
    staleTime: 30 * 60 * 1000,
  });

  const filesQuery = useQuery({
    queryKey: [...queryKeys.codegen.files(project?.id ?? ""), downloadUrlQuery.data?.url],
    queryFn: () => fetchAndUnzipProject(downloadUrlQuery.data!.url),
    enabled: Boolean(downloadUrlQuery.data?.url),
    staleTime: 30 * 60 * 1000,
  });

  return {
    isLoading: papersQuery.isLoading || (Boolean(paperId) && versionsQuery.isLoading),
    isError: papersQuery.isError || versionsQuery.isError || detailQuery.isError,
    hasPaper: Boolean(paperId),
    paperId,
    versions,
    latestVersion,
    resolvedVersion,
    project,
    isProjectLoading: detailQuery.isLoading,
    extractedKnowledge,
    parsedPaper,
    files: filesQuery.data ?? null,
    isFilesLoading: downloadUrlQuery.isLoading || filesQuery.isLoading,
    filesError: filesQuery.isError ? (filesQuery.error as Error).message : null,
    downloadUrl: downloadUrlQuery.data?.url ?? null,
  };
}
