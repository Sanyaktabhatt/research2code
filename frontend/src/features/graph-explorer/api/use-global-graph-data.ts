"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { listProjects } from "@/lib/api/endpoints/projects";
import { listPapersForProject } from "@/lib/api/endpoints/papers";
import { getPaperGraph } from "@/lib/api/endpoints/graph";
import { ApiError } from "@/lib/api/error";
import { queryKeys } from "@/lib/query/keys";
import type { GraphSnapshot, Paper, Project } from "@/types/domain";

/** Backend caps `page_size` at 100 (projects endpoint), so larger accounts are fetched page by page. */
const PROJECT_PAGE_SIZE = 100;

async function listAllProjects(): Promise<Project[]> {
  const first = await listProjects(1, PROJECT_PAGE_SIZE);
  const items = [...first.items];
  const pageCount = Math.ceil(first.total / PROJECT_PAGE_SIZE);
  for (let page = 2; page <= pageCount; page++) {
    const next = await listProjects(page, PROJECT_PAGE_SIZE);
    items.push(...next.items);
  }
  return items;
}

export type GraphSourceStatus =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "no-paper" }
  | { kind: "paper-not-ready"; paperStatus: Paper["status"] }
  | { kind: "no-graph" }
  | { kind: "loaded"; snapshot: GraphSnapshot };

export interface GraphSource {
  project: Project;
  paper: Paper | null;
  status: GraphSourceStatus;
  retry: () => void;
}

function errorMessage(error: unknown): string {
  return ApiError.isApiError(error) ? error.detail : error instanceof Error ? error.message : "Unknown error";
}

/**
 * Aggregates every project the signed-in user can access into one list of
 * graph sources. There is no backend aggregate endpoint, so this composes
 * the same per-resource calls the project-level graph uses - the list is
 * owner/admin-scoped server-side, and each GET /papers/{id}/graph re-checks
 * project access - and shares their React Query cache keys.
 *
 * Mirrors the project-level convention that a project's graph is its most
 * recently uploaded paper's graph (see useGraphExplorerData). Every project
 * is reported with an explicit status, so a failed or not-yet-built graph is
 * surfaced rather than silently dropped.
 */
export function useGlobalGraphData() {
  const projectsQuery = useQuery({
    queryKey: [...queryKeys.projects.all(), "all-pages"],
    queryFn: listAllProjects,
  });
  const projects = projectsQuery.data ?? [];

  const paperQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: queryKeys.papers.list(project.id),
      queryFn: () => listPapersForProject(project.id),
    })),
  });

  const latestPapers = paperQueries.map((query) => query.data?.[0] ?? null);

  const graphQueries = useQueries({
    queries: latestPapers.map((paper) => ({
      queryKey: queryKeys.graph.snapshot(paper?.id ?? ""),
      queryFn: () => getPaperGraph(paper!.id),
      enabled: paper?.status === "completed",
    })),
  });

  const sources: GraphSource[] = projects.map((project, index) => {
    const papersQuery = paperQueries[index]!;
    const graphQuery = graphQueries[index]!;
    const paper = latestPapers[index] ?? null;

    let status: GraphSourceStatus;
    if (papersQuery.isError) status = { kind: "error", message: errorMessage(papersQuery.error) };
    else if (papersQuery.isLoading) status = { kind: "loading" };
    else if (!paper) status = { kind: "no-paper" };
    else if (paper.status !== "completed") status = { kind: "paper-not-ready", paperStatus: paper.status };
    else if (graphQuery.isError) status = { kind: "error", message: errorMessage(graphQuery.error) };
    else if (graphQuery.isLoading) status = { kind: "loading" };
    else if (!graphQuery.data || graphQuery.data.nodes.length === 0) status = { kind: "no-graph" };
    else status = { kind: "loaded", snapshot: graphQuery.data };

    return {
      project,
      paper,
      status,
      retry: () => {
        if (papersQuery.isError) void papersQuery.refetch();
        else void graphQuery.refetch();
      },
    };
  });

  return {
    isLoadingProjects: projectsQuery.isLoading,
    projectsError: projectsQuery.isError ? errorMessage(projectsQuery.error) : null,
    retryProjects: () => void projectsQuery.refetch(),
    sources,
  };
}
