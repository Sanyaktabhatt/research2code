"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getExecutionRunLogDownloadUrl,
  getExecutionRunTensorboardUrl,
  getExecutionRunVersion,
} from "@/lib/api/endpoints/execution-runs";
import { queryKeys } from "@/lib/query/keys";

export function useRunDetail(generatedProjectId: string | null, version: number | null) {
  const detailQuery = useQuery({
    queryKey: queryKeys.executionRuns.version(generatedProjectId ?? "", version ?? 0),
    queryFn: () => getExecutionRunVersion(generatedProjectId as string, version as number),
    enabled: Boolean(generatedProjectId) && version !== null,
  });
  const run = detailQuery.data ?? null;

  const tensorboardQuery = useQuery({
    queryKey: queryKeys.executionRuns.tensorboardUrl(run?.id ?? ""),
    queryFn: () => getExecutionRunTensorboardUrl(run!.id),
    enabled: Boolean(run) && run?.tensorboard_log_dir !== null,
    staleTime: 5 * 60 * 1000,
  });

  const logDownloadQuery = useQuery({
    queryKey: queryKeys.executionRuns.logDownloadUrl(run?.id ?? ""),
    queryFn: () => getExecutionRunLogDownloadUrl(run!.id),
    enabled: Boolean(run) && run?.log_storage_key !== null,
    staleTime: 5 * 60 * 1000,
  });

  return {
    run,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    tensorboardUrl: tensorboardQuery.data?.url ?? null,
    isTensorboardLoading: tensorboardQuery.isLoading,
    logDownloadUrl: logDownloadQuery.data?.url ?? null,
  };
}
