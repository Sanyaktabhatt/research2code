import type { PipelineStageStatus } from "@/types/domain";

export type WorkspacePipelineStageId =
  | "uploaded"
  | "parsing"
  | "knowledge_extraction"
  | "embedding_generation"
  | "knowledge_graph"
  | "rag_ready"
  | "code_generation"
  | "execution_ready"
  | "running"
  | "completed";

export interface PipelineStageInfo {
  id: WorkspacePipelineStageId;
  label: string;
  status: PipelineStageStatus;
  timestamp: string | null;
  durationSeconds: number | null;
  /** 0-100, null when the backend doesn't expose a fraction for this stage. */
  progress: number | null;
}
