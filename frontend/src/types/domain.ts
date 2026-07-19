/**
 * These mirror backend/app/schemas/*.py response models field-for-field
 * (including snake_case) since apiFetch returns parsed JSON as-is with no
 * transform layer. Keep them in sync with the Pydantic schemas rather than
 * "prettifying" field names here.
 */

export type ProjectStatus = "created" | "processing" | "completed" | "failed";
export type PaperStatus = "pending" | "processing" | "completed" | "failed";
export type KnowledgeExtractionStatus = "pending" | "processing" | "completed" | "failed";
export type EmbeddingStatus = "pending" | "completed";
export type GeneratedProjectStatus = "pending" | "generating" | "validating" | "completed" | "failed";
export type ExecutionRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type ExecutionDevice = "cpu" | "gpu";

/** UI-normalized status used by StageBadge, independent of which backend enum it came from. */
export type PipelineStageStatus = "pending" | "running" | "success" | "error";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Paper {
  id: string;
  project_id: string;
  original_filename: string;
  content_type: string | null;
  size_bytes: number;
  status: PaperStatus;
  created_at: string;
}

export interface PaperDetail extends Paper {
  error_message: string | null;
  parsed_data: Record<string, unknown> | null;
}

export interface KnowledgeExtraction {
  id: string;
  paper_id: string;
  version: number;
  status: KnowledgeExtractionStatus;
  model_provider: string | null;
  model_name: string | null;
  created_at: string;
}

export interface KnowledgeExtractionDetail extends KnowledgeExtraction {
  error_message: string | null;
  /** Deep LLM-extracted structure (see backend/app/agents/schemas.py::ExtractedKnowledge) - not rendered in detail yet. */
  extracted_data: Record<string, unknown> | null;
}

export interface EmbeddingStatusInfo {
  paper_id: string;
  status: EmbeddingStatus;
  count: number;
  updated_at: string | null;
}

export interface GraphNode {
  key: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphRelationship {
  type: string;
  start_key: string;
  end_key: string;
  properties: Record<string, unknown>;
}

export interface GraphSnapshot {
  paper_id: string;
  knowledge_extraction_id: string;
  version: number;
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

export type EmbeddingSourceType = "section" | "knowledge_entity" | "figure_caption" | "table_description" | "equation_description";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface RAGQueryRequest {
  query: string;
  paper_id?: string | null;
  source_types?: EmbeddingSourceType[] | null;
  history?: ConversationTurn[];
  limit?: number;
  token_budget?: number | null;
}

export interface Citation {
  index: number;
  paper_id: string;
  source_type: EmbeddingSourceType;
  source_ref: string;
  page_number: number | null;
  section_name: string | null;
  score: number;
}

export interface RAGAnswer {
  answer: string;
  citations: Citation[];
}

export interface WarmCacheResponse {
  paper_id: string;
  queued: boolean;
}

/** `/rag/ws` frame shapes - see backend/app/api/v1/endpoints/rag.py. */
export type RagWsFrame =
  | { type: "token"; content: string }
  | { type: "done"; citations: Citation[] }
  | { type: "error"; detail: unknown };

export interface GeneratedProject {
  id: string;
  paper_id: string;
  knowledge_extraction_id: string;
  version: number;
  status: GeneratedProjectStatus;
  framework: string;
  model_provider: string | null;
  model_name: string | null;
  quality_score: number | null;
  created_at: string;
}

export type QualityIssueSeverity = "error" | "warning";

export interface QualityIssue {
  category: string;
  severity: QualityIssueSeverity;
  message: string;
  file_path: string | null;
}

export interface QualityReport {
  score: number;
  issues: QualityIssue[];
}

/** `GenerationOptions` (backend/app/codegen/schemas.py) as dumped into `generation_params`. */
export interface GenerationParams {
  framework: string;
  project_name: string;
  use_amp: boolean;
  use_ddp: boolean;
  use_tensorboard: boolean;
  use_mlflow: boolean;
  early_stopping: boolean;
}

export interface GeneratedProjectDetail extends GeneratedProject {
  generation_params: GenerationParams;
  file_manifest: string[] | null;
  quality_report: QualityReport | null;
  error_message: string | null;
}

export interface GeneratedProjectDownloadResponse {
  url: string;
  expires_in_seconds: number;
}

export interface ExecutionRun {
  id: string;
  generated_project_id: string;
  paper_id: string;
  version: number;
  status: ExecutionRunStatus;
  execution_backend: string;
  device: ExecutionDevice;
  mlflow_run_id: string | null;
  exit_code: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface ExecutionRunDetail extends ExecutionRun {
  container_id: string | null;
  mlflow_experiment_id: string | null;
  tensorboard_log_dir: string | null;
  log_storage_key: string | null;
  artifact_prefix: string | null;
  artifact_manifest: string[] | null;
  params_snapshot: Record<string, unknown> | null;
  metrics_summary: Record<string, unknown> | null;
  error_message: string | null;
}

export interface TensorBoardUrlResponse {
  url: string;
}

export interface LogDownloadResponse {
  url: string;
  expires_in_seconds: number;
}

export interface ParameterDiff {
  key: string;
  values: Record<string, string | null>;
  differs: boolean;
}

export interface MetricDiff {
  key: string;
  values: Record<string, number | null>;
  differs: boolean;
}

export interface ComparisonResult {
  execution_run_ids: string[];
  parameter_diffs: ParameterDiff[];
  metric_diffs: MetricDiff[];
  best_run_id: string | null;
  best_metric: string | null;
  best_value: number | null;
}

/** `/execution-runs/{id}/progress` frame shapes - see backend/app/api/v1/endpoints/execution.py + execution/celery_tasks.py. */
export type ExecutionWsFrame =
  | { type: "status"; status: ExecutionRunStatus; error?: string }
  | { type: "log"; line: string }
  | {
      type: "metrics";
      epoch: number | null;
      total_epochs: number | null;
      step: number | null;
      total_steps: number | null;
      elapsed_seconds: number;
      eta_seconds: number | null;
      cpu_percent: number | null;
      memory_mb: number | null;
      memory_limit_mb: number | null;
      gpu_utilization_percent: number | null;
      gpu_memory_mb: number | null;
      disk_usage_percent: number | null;
    };

export type HealthCheckResult = "ok" | (string & {});

export interface HealthStatus {
  status: "ok" | "unhealthy";
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    neo4j: HealthCheckResult;
    minio: HealthCheckResult;
  };
}
