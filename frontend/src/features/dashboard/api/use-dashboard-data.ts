"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { projectsListQueryOptions } from "@/features/projects/api/query-options";
import {
  activeExecutionRunsQueryOptions,
  activeGeneratedProjectsQueryOptions,
  healthQueryOptions,
  recentExecutionRunsQueryOptions,
  recentGeneratedProjectsQueryOptions,
  recentPapersQueryOptions,
} from "@/features/dashboard/api/query-options";

export function useRecentProjectsSuspense(pageSize = 50) {
  return useSuspenseQuery(projectsListQueryOptions(1, pageSize));
}

export function useRecentPapersSuspense(limit = 8) {
  return useSuspenseQuery(recentPapersQueryOptions(limit));
}

export function useRecentGeneratedProjectsSuspense(limit = 8) {
  return useSuspenseQuery(recentGeneratedProjectsQueryOptions(limit));
}

export function useRecentExecutionRunsSuspense(limit = 8) {
  return useSuspenseQuery(recentExecutionRunsQueryOptions(limit));
}

export function useActiveJobsSuspense() {
  const generatedProjects = useSuspenseQuery(activeGeneratedProjectsQueryOptions());
  const executionRuns = useSuspenseQuery(activeExecutionRunsQueryOptions());
  return { generatedProjects: generatedProjects.data, executionRuns: executionRuns.data };
}

export function useHealthSuspense() {
  return useSuspenseQuery(healthQueryOptions());
}
