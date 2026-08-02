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
 *
 * Ordering note: after Parsing, the real backend pipeline forks into two
 * independent branches, not one strict chain - paper-level embeddings (and
 * RAG readiness, which only needs those) are queued automatically right
 * after parsing, while Knowledge Extraction only ever starts when the user
 * clicks "Extract knowledge", and Code Generation depends on *that*, not on
 * embeddings/RAG at all (see codegen_service.py's trigger_generation, which
 * only checks the latest knowledge extraction's status). Embeddings/RAG
 * therefore routinely complete before extraction even starts. This list is
 * still rendered as one flat, connected timeline (see PipelineTracker /
 * Timeline), so it's ordered by *typical real completion order* - automatic
 * stages before the manually-triggered ones - rather than by the
 * mental-model-only "10 sequential steps" grouping used previously, which
 * made a later-listed automatic stage completing before an earlier-listed
 * manual one look like the pipeline had skipped a step.
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
      id: "embedding_generation",
      label: "Embedding Generation",
      status: !paperParsed ? "pending" : embeddingsCompleted ? "success" : "pending",
      timestamp: embeddings?.updated_at ?? null,
      durationSeconds: null,
      progress: null,
    },
    {
      id: "rag_ready",
      label: "RAG Ready",
      // RAG only needs paper-level embeddings (see backend RAGService /
      // RetrievalService, which never checks knowledge-extraction status) -
      // gating this on `knowledgeCompleted` left it permanently "pending"
      // with a stale timestamp for anyone who generates embeddings before
      // running knowledge extraction.
      status: embeddingsCompleted ? "success" : "pending",
      timestamp: embeddings?.updated_at ?? null,
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
      id: "knowledge_graph",
      label: "Knowledge Graph",
      status: !knowledgeCompleted ? "pending" : graph ? "success" : "pending",
      // GraphSnapshot has no build-time field of its own (Neo4j only stores
      // the resulting nodes/relationships, not snapshot metadata - see
      // backend/app/schemas/graph.py), and KnowledgeExtractionRead doesn't
      // expose `updated_at` (only `created_at`, i.e. when extraction was
      // *queued*, not completed) - so this is an approximation, off by
      // however long extraction itself took, not the exact graph-build
      // time. Good enough at this tracker's hour-granularity display, and
      // still far more useful than a permanently blank timestamp.
      timestamp: graph ? (knowledge?.created_at ?? null) : null,
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
