"use client";

import { useQuery } from "@tanstack/react-query";
import { listPapersForProject } from "@/lib/api/endpoints/papers";
import { getLatestKnowledgeExtraction } from "@/lib/api/endpoints/knowledge";
import { getEmbeddingStatus } from "@/lib/api/endpoints/embeddings";
import { getPaperGraph } from "@/lib/api/endpoints/graph";
import { getLatestGeneratedProject } from "@/lib/api/endpoints/generated-projects";
import { getLatestExecutionRun } from "@/lib/api/endpoints/execution-runs";
import { queryKeys } from "@/lib/query/keys";
import { buildPipelineStages } from "@/features/workspace/lib/build-pipeline-stages";
import type { PipelineStageInfo } from "@/features/workspace/types";
import type {
  EmbeddingStatusInfo,
  ExecutionRunDetail,
  GeneratedProjectDetail,
  GraphSnapshot,
  KnowledgeExtractionDetail,
  Paper,
} from "@/types/domain";

/**
 * Polling interval for every resource behind the tracker. This is the one
 * place that would change to swap polling for the backend's existing
 * per-resource WebSockets (`/generated-projects/{id}/progress`,
 * `/execution-runs/{id}/progress}`) - PipelineTracker itself only takes a
 * `stages` + `isLive` prop pair and has no idea data arrives via polling.
 */
const POLL_INTERVAL_MS = 4000;

interface UsePipelineTrackerResult {
  stages: PipelineStageInfo[];
  isLoading: boolean;
  isLive: boolean;
  paper: Paper | undefined;
  knowledge: KnowledgeExtractionDetail | null | undefined;
  embeddings: EmbeddingStatusInfo | null | undefined;
  graph: GraphSnapshot | null | undefined;
  generatedProject: GeneratedProjectDetail | null | undefined;
  executionRun: ExecutionRunDetail | null | undefined;
}

export function usePipelineTracker(projectId: string): UsePipelineTrackerResult {
  const papersQuery = useQuery({
    queryKey: queryKeys.papers.list(projectId),
    queryFn: () => listPapersForProject(projectId),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const paper = papersQuery.data?.[0];

  const knowledgeQuery = useQuery({
    queryKey: queryKeys.knowledge.latest(paper?.id ?? ""),
    queryFn: () => getLatestKnowledgeExtraction(paper!.id),
    enabled: Boolean(paper) && paper?.status === "completed",
    refetchInterval: POLL_INTERVAL_MS,
  });

  const embeddingsQuery = useQuery({
    queryKey: queryKeys.embeddings.status(paper?.id ?? ""),
    queryFn: () => getEmbeddingStatus(paper!.id),
    enabled: Boolean(paper) && paper?.status === "completed",
    refetchInterval: POLL_INTERVAL_MS,
  });

  const graphQuery = useQuery({
    queryKey: queryKeys.graph.snapshot(paper?.id ?? ""),
    queryFn: () => getPaperGraph(paper!.id),
    enabled: knowledgeQuery.data?.status === "completed",
    refetchInterval: POLL_INTERVAL_MS,
  });

  const generatedProjectQuery = useQuery({
    queryKey: queryKeys.codegen.latestForPaper(paper?.id ?? ""),
    queryFn: () => getLatestGeneratedProject(paper!.id),
    enabled: Boolean(paper),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const generatedProject = generatedProjectQuery.data;

  const executionRunQuery = useQuery({
    queryKey: queryKeys.executionRuns.latestForGeneratedProject(generatedProject?.id ?? ""),
    queryFn: () => getLatestExecutionRun(generatedProject!.id),
    enabled: Boolean(generatedProject),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const stages = buildPipelineStages({
    paper,
    knowledge: knowledgeQuery.data,
    embeddings: embeddingsQuery.data,
    graph: graphQuery.data,
    generatedProject,
    executionRun: executionRunQuery.data,
  });

  return {
    stages,
    isLoading: papersQuery.isLoading,
    isLive: true,
    paper,
    knowledge: knowledgeQuery.data,
    embeddings: embeddingsQuery.data,
    graph: graphQuery.data,
    generatedProject,
    executionRun: executionRunQuery.data,
  };
}
