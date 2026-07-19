import { queryOptions } from "@tanstack/react-query";
import { getHealth } from "@/lib/api/endpoints/health";
import { listRecentPapers } from "@/lib/api/endpoints/papers";
import { listRecentGeneratedProjects } from "@/lib/api/endpoints/generated-projects";
import { listRecentExecutionRuns } from "@/lib/api/endpoints/execution-runs";
import { queryKeys } from "@/lib/query/keys";
import {
  ACTIVE_EXECUTION_RUN_STATUSES,
  ACTIVE_GENERATED_PROJECT_STATUSES,
} from "@/lib/utils/status-mapping";

export function recentPapersQueryOptions(limit = 10) {
  return queryOptions({
    queryKey: queryKeys.papers.recent(limit),
    queryFn: () => listRecentPapers(limit),
  });
}

export function recentGeneratedProjectsQueryOptions(limit = 10) {
  return queryOptions({
    queryKey: queryKeys.codegen.recent(limit),
    queryFn: () => listRecentGeneratedProjects(limit),
  });
}

export function recentExecutionRunsQueryOptions(limit = 10) {
  return queryOptions({
    queryKey: queryKeys.executionRuns.recent(limit),
    queryFn: () => listRecentExecutionRuns(limit),
  });
}

/** Active (in-flight) codegen jobs, polled while the Job Queue widget is mounted. */
export function activeGeneratedProjectsQueryOptions(limit = 20) {
  return queryOptions({
    queryKey: queryKeys.codegen.recent(limit, ACTIVE_GENERATED_PROJECT_STATUSES),
    queryFn: () => listRecentGeneratedProjects(limit, ACTIVE_GENERATED_PROJECT_STATUSES),
    refetchInterval: 5000,
  });
}

/** Active (in-flight) execution runs, polled while the Job Queue widget is mounted. */
export function activeExecutionRunsQueryOptions(limit = 20) {
  return queryOptions({
    queryKey: queryKeys.executionRuns.recent(limit, ACTIVE_EXECUTION_RUN_STATUSES),
    queryFn: () => listRecentExecutionRuns(limit, ACTIVE_EXECUTION_RUN_STATUSES),
    refetchInterval: 5000,
  });
}

export function healthQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.health.ready(),
    queryFn: getHealth,
    refetchInterval: 15000,
  });
}
