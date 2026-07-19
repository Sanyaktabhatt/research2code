"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getGeneratedProjectDownloadUrl,
  getGeneratedProjectVersion,
} from "@/lib/api/endpoints/generated-projects";
import { queryKeys } from "@/lib/query/keys";
import { fetchAndUnzipProject } from "@/features/generated-project/lib/unzip-project";

/** Standalone project+files loader for one arbitrary version - used for the "compare against" side of Version Comparison, independent of whichever version is primarily open. */
export function useVersionFiles(paperId: string | null, version: number | null) {
  const detailQuery = useQuery({
    queryKey: queryKeys.codegen.version(paperId ?? "", version ?? 0),
    queryFn: () => getGeneratedProjectVersion(paperId as string, version as number),
    enabled: Boolean(paperId) && version !== null,
  });
  const project = detailQuery.data ?? null;

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
    project,
    files: filesQuery.data ?? null,
    isLoading: detailQuery.isLoading || downloadUrlQuery.isLoading || filesQuery.isLoading,
  };
}
