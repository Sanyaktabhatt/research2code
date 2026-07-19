"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProject, getProject } from "@/lib/api/endpoints/projects";
import { projectsListQueryOptions } from "@/features/projects/api/query-options";
import { queryKeys } from "@/lib/query/keys";

export function useProjects(page = 1, pageSize = 20) {
  return useQuery(projectsListQueryOptions(page, pageSize));
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId ?? ""),
    queryFn: () => getProject(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
    },
  });
}
