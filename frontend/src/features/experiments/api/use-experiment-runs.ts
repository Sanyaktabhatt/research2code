"use client";

import * as React from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { listPapersForProject } from "@/lib/api/endpoints/papers";
import { listKnowledgeExtractions } from "@/lib/api/endpoints/knowledge";
import { listGeneratedProjectsForPaper } from "@/lib/api/endpoints/generated-projects";
import { listExecutionRunsForGeneratedProject } from "@/lib/api/endpoints/execution-runs";
import { queryKeys } from "@/lib/query/keys";
import { enrichRuns } from "@/features/experiments/lib/enrich-runs";
import type { ExecutionRun, GeneratedProject } from "@/types/domain";

const EMPTY_GENERATED_PROJECTS: GeneratedProject[] = [];

/**
 * Execution runs are scoped to one generated-project version, and a paper
 * can have many generated-project versions (see backend/app/models
 * /execution_run.py's per-generated-project versioning) - there is no
 * single "all runs for a project" endpoint, so this fans out one list
 * query per generated-project version and flattens the results.
 */
export function useExperimentRuns(projectId: string) {
  const papersQuery = useQuery({
    queryKey: queryKeys.papers.list(projectId),
    queryFn: () => listPapersForProject(projectId),
  });
  const paperId = papersQuery.data?.[0]?.id ?? null;

  const generatedProjectsQuery = useQuery({
    queryKey: queryKeys.codegen.forPaper(paperId ?? ""),
    queryFn: () => listGeneratedProjectsForPaper(paperId as string),
    enabled: Boolean(paperId),
  });
  const generatedProjects = generatedProjectsQuery.data ?? EMPTY_GENERATED_PROJECTS;

  const knowledgeExtractionsQuery = useQuery({
    queryKey: queryKeys.knowledge.list(paperId ?? ""),
    queryFn: () => listKnowledgeExtractions(paperId as string),
    enabled: Boolean(paperId),
  });

  const runsQueries = useQueries({
    queries: generatedProjects.map((project) => ({
      queryKey: queryKeys.executionRuns.forGeneratedProject(project.id),
      queryFn: () => listExecutionRunsForGeneratedProject(project.id),
      enabled: Boolean(paperId),
    })),
  });

  const isRunsLoading = runsQueries.some((q) => q.isLoading);
  const isRunsError = runsQueries.some((q) => q.isError);

  const allRuns = React.useMemo<ExecutionRun[]>(() => runsQueries.flatMap((q) => q.data ?? []), [runsQueries]);

  const enrichedRuns = React.useMemo(
    () => enrichRuns(allRuns, generatedProjects, knowledgeExtractionsQuery.data ?? []),
    [allRuns, generatedProjects, knowledgeExtractionsQuery.data],
  );

  return {
    isLoading: papersQuery.isLoading || (Boolean(paperId) && (generatedProjectsQuery.isLoading || isRunsLoading)),
    isError: papersQuery.isError || generatedProjectsQuery.isError || isRunsError,
    hasPaper: Boolean(paperId),
    paperId,
    hasGeneratedProject: generatedProjects.length > 0,
    runs: enrichedRuns,
  };
}
