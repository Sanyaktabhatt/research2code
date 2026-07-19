"use client";

import { useQuery } from "@tanstack/react-query";
import { compareExecutionRuns } from "@/lib/api/endpoints/execution-runs";
import { queryKeys } from "@/lib/query/keys";

export function useRunComparison(runIds: string[]) {
  const query = useQuery({
    queryKey: queryKeys.executionRuns.compare(runIds),
    queryFn: () => compareExecutionRuns(runIds),
    enabled: runIds.length >= 2,
  });

  return { result: query.data ?? null, isLoading: query.isLoading, isError: query.isError };
}
