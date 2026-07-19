"use client";

import * as React from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getPaper, listPapersForProject } from "@/lib/api/endpoints/papers";
import { listKnowledgeExtractions } from "@/lib/api/endpoints/knowledge";
import { getPaperGraph } from "@/lib/api/endpoints/graph";
import { getGeneratedProjectVersion, listGeneratedProjectsForPaper } from "@/lib/api/endpoints/generated-projects";
import { getExecutionRunVersion, listExecutionRunsForGeneratedProject } from "@/lib/api/endpoints/execution-runs";
import { useProject } from "@/features/projects/api/use-projects";
import { queryKeys } from "@/lib/query/keys";
import { buildArtifacts } from "@/features/artifacts-center/lib/build-artifacts";
import type {
  ExecutionRun,
  ExecutionRunDetail,
  GeneratedProject,
  GeneratedProjectDetail,
  GraphSnapshot,
  KnowledgeExtraction,
  Paper,
  PaperDetail,
} from "@/types/domain";

const EMPTY_PAPERS: Paper[] = [];

/**
 * Every artifact category the center displays traces back to a real,
 * already-existing endpoint - there is no "list all artifacts for a
 * project" endpoint, so this fans out across the full resource tree
 * (papers -> knowledge extractions/graph/generated projects -> execution
 * runs -> their manifests) the same way useExperimentRuns does one level
 * up, just deeper.
 */
export function useAllArtifacts(projectId: string) {
  const projectQuery = useProject(projectId);

  const papersQuery = useQuery({
    queryKey: queryKeys.papers.list(projectId),
    queryFn: () => listPapersForProject(projectId),
  });
  const papers = papersQuery.data ?? EMPTY_PAPERS;

  const paperDetailQueries = useQueries({
    queries: papers.map((paper) => ({
      queryKey: queryKeys.papers.detail(projectId, paper.id),
      queryFn: () => getPaper(projectId, paper.id),
    })),
  });

  const keListQueries = useQueries({
    queries: papers.map((paper) => ({
      queryKey: queryKeys.knowledge.list(paper.id),
      queryFn: () => listKnowledgeExtractions(paper.id),
    })),
  });

  const graphQueries = useQueries({
    queries: papers.map((paper) => ({
      queryKey: queryKeys.graph.snapshot(paper.id),
      queryFn: () => getPaperGraph(paper.id),
    })),
  });

  const gpListQueries = useQueries({
    queries: papers.map((paper) => ({
      queryKey: queryKeys.codegen.forPaper(paper.id),
      queryFn: () => listGeneratedProjectsForPaper(paper.id),
    })),
  });
  const allGeneratedProjects = React.useMemo<GeneratedProject[]>(() => gpListQueries.flatMap((q) => q.data ?? []), [gpListQueries]);

  const gpDetailQueries = useQueries({
    queries: allGeneratedProjects.map((gp) => ({
      queryKey: queryKeys.codegen.version(gp.paper_id, gp.version),
      queryFn: () => getGeneratedProjectVersion(gp.paper_id, gp.version),
    })),
  });

  const runListQueries = useQueries({
    queries: allGeneratedProjects.map((gp) => ({
      queryKey: queryKeys.executionRuns.forGeneratedProject(gp.id),
      queryFn: () => listExecutionRunsForGeneratedProject(gp.id),
    })),
  });
  const allRuns = React.useMemo<ExecutionRun[]>(() => runListQueries.flatMap((q) => q.data ?? []), [runListQueries]);

  const runDetailQueries = useQueries({
    queries: allRuns.map((run) => ({
      queryKey: queryKeys.executionRuns.version(run.generated_project_id, run.version),
      queryFn: () => getExecutionRunVersion(run.generated_project_id, run.version),
    })),
  });

  const isLoading =
    projectQuery.isLoading ||
    papersQuery.isLoading ||
    paperDetailQueries.some((q) => q.isLoading) ||
    keListQueries.some((q) => q.isLoading) ||
    graphQueries.some((q) => q.isLoading) ||
    gpListQueries.some((q) => q.isLoading) ||
    gpDetailQueries.some((q) => q.isLoading) ||
    runListQueries.some((q) => q.isLoading) ||
    runDetailQueries.some((q) => q.isLoading);

  const isError =
    projectQuery.isError ||
    papersQuery.isError ||
    paperDetailQueries.some((q) => q.isError) ||
    keListQueries.some((q) => q.isError);

  const artifacts = React.useMemo(() => {
    const paperDetailById = new Map<string, PaperDetail>();
    papers.forEach((paper, i) => {
      const detail = paperDetailQueries[i]?.data;
      if (detail) paperDetailById.set(paper.id, detail);
    });

    const knowledgeExtractionsByPaper = new Map<string, KnowledgeExtraction[]>();
    papers.forEach((paper, i) => {
      knowledgeExtractionsByPaper.set(paper.id, keListQueries[i]?.data ?? []);
    });

    const graphByPaper = new Map<string, GraphSnapshot | null>();
    papers.forEach((paper, i) => {
      graphByPaper.set(paper.id, graphQueries[i]?.data ?? null);
    });

    const generatedProjectsByPaper = new Map<string, GeneratedProject[]>();
    papers.forEach((paper, i) => {
      generatedProjectsByPaper.set(paper.id, gpListQueries[i]?.data ?? []);
    });

    const generatedProjectDetailById = new Map<string, GeneratedProjectDetail>();
    allGeneratedProjects.forEach((gp, i) => {
      const detail = gpDetailQueries[i]?.data;
      if (detail) generatedProjectDetailById.set(gp.id, detail);
    });

    const executionRunsByGeneratedProject = new Map<string, ExecutionRun[]>();
    allGeneratedProjects.forEach((gp, i) => {
      executionRunsByGeneratedProject.set(gp.id, runListQueries[i]?.data ?? []);
    });

    const executionRunDetailById = new Map<string, ExecutionRunDetail>();
    allRuns.forEach((run, i) => {
      const detail = runDetailQueries[i]?.data;
      if (detail) executionRunDetailById.set(run.id, detail);
    });

    return buildArtifacts({
      papers,
      paperDetailById,
      knowledgeExtractionsByPaper,
      graphByPaper,
      generatedProjectsByPaper,
      generatedProjectDetailById,
      executionRunsByGeneratedProject,
      executionRunDetailById,
    });
  }, [papers, allGeneratedProjects, allRuns, paperDetailQueries, keListQueries, graphQueries, gpListQueries, gpDetailQueries, runListQueries, runDetailQueries]);

  return {
    isLoading,
    isError,
    hasPapers: papers.length > 0,
    projectName: projectQuery.data?.name ?? null,
    artifacts,
  };
}
