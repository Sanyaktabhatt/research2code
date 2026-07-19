import {
  executionRunStatusToStage,
  generatedProjectStatusToStage,
  knowledgeExtractionStatusToStage,
  paperStatusToStage,
} from "@/lib/utils/status-mapping";
import type {
  EmbeddingStatusInfo,
  ExecutionRun,
  GeneratedProject,
  GraphSnapshot,
  KnowledgeExtraction,
  Paper,
} from "@/types/domain";
import type { PipelineStageInfo } from "@/features/workspace/types";

interface BuildStagesInput {
  paper: Paper | undefined;
  knowledge: KnowledgeExtraction | null | undefined;
  embeddings: EmbeddingStatusInfo | null | undefined;
  graph: GraphSnapshot | null | undefined;
  generatedProject: GeneratedProject | null | undefined;
  executionRun: ExecutionRun | null | undefined;
}

function durationSeconds(startedAt: string | null, finishedAt: string | null): number | null {
  if (!startedAt || !finishedAt) return null;
  return Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000));
}

/**
 * Pure derivation from real backend resources into the workspace's 10-stage
 * tracker. No fabricated numeric "progress" - the backend doesn't expose a
 * fraction for any of these stages, so `progress` stays null everywhere
 * (PipelineTracker falls back to a discrete status marker per stage).
 */
export function buildPipelineStages({
  paper,
  knowledge,
  embeddings,
  graph,
  generatedProject,
  executionRun,
}: BuildStagesInput): PipelineStageInfo[] {
  const paperParsed = paper?.status === "completed";
  const knowledgeCompleted = knowledge?.status === "completed";
  const embeddingsCompleted = embeddings?.status === "completed";

  const stages: PipelineStageInfo[] = [
    {
      id: "uploaded",
      label: "Uploaded",
      status: paper ? "success" : "pending",
      timestamp: paper?.created_at ?? null,
      durationSeconds: null,
      progress: null,
    },
    {
      id: "parsing",
      label: "Parsing",
      status: paper ? paperStatusToStage(paper.status) : "pending",
      timestamp: paper?.created_at ?? null,
      durationSeconds: null,
      progress: null,
    },
    {
      id: "knowledge_extraction",
      label: "Knowledge Extraction",
      status: !paperParsed ? "pending" : knowledge ? knowledgeExtractionStatusToStage(knowledge.status) : "pending",
      timestamp: knowledge?.created_at ?? null,
      durationSeconds: null,
      progress: null,
    },
    {
      id: "embedding_generation",
      label: "Embedding Generation",
      status: !paperParsed ? "pending" : embeddingsCompleted ? "success" : "pending",
      timestamp: embeddings?.updated_at ?? null,
      durationSeconds: null,
      progress: null,
    },
    {
      id: "knowledge_graph",
      label: "Knowledge Graph",
      status: !knowledgeCompleted ? "pending" : graph ? "success" : "pending",
      timestamp: null,
      durationSeconds: null,
      progress: null,
    },
    {
      id: "rag_ready",
      label: "RAG Ready",
      status: knowledgeCompleted && embeddingsCompleted ? "success" : "pending",
      timestamp: embeddings?.updated_at ?? null,
      durationSeconds: null,
      progress: null,
    },
    {
      id: "code_generation",
      label: "Code Generation",
      status: generatedProject ? generatedProjectStatusToStage(generatedProject.status) : "pending",
      timestamp: generatedProject?.created_at ?? null,
      durationSeconds: null,
      progress: null,
    },
    {
      id: "execution_ready",
      label: "Execution Ready",
      status: generatedProject?.status === "completed" ? "success" : "pending",
      timestamp: generatedProject?.status === "completed" ? generatedProject.created_at : null,
      durationSeconds: null,
      progress: null,
    },
    {
      id: "running",
      label: "Running",
      status: !executionRun
        ? "pending"
        : executionRun.status === "running"
          ? "running"
          : executionRun.status === "queued"
            ? "pending"
            : "success",
      timestamp: executionRun?.started_at ?? null,
      durationSeconds: null,
      progress: null,
    },
    {
      id: "completed",
      label: "Completed",
      status: !executionRun
        ? "pending"
        : executionRun.status === "completed"
          ? "success"
          : executionRun.status === "failed" || executionRun.status === "cancelled"
            ? "error"
            : "pending",
      timestamp: executionRun?.finished_at ?? null,
      durationSeconds: executionRun ? durationSeconds(executionRun.started_at, executionRun.finished_at) : null,
      progress: null,
    },
  ];

  return stages;
}
