export type ArtifactCategory =
  | "uploaded_paper"
  | "parsed_output"
  | "knowledge_extraction"
  | "knowledge_graph"
  | "generated_project"
  | "experiment_output"
  | "checkpoint"
  | "exported_model"
  | "tensorboard_log"
  | "mlflow_artifact"
  | "execution_log"
  | "plot";

export const PIPELINE_STAGES = [
  "Paper Upload",
  "Parsing",
  "Knowledge Extraction",
  "Embeddings",
  "Knowledge Graph",
  "Code Generation",
  "Execution",
  "Results",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type PreviewKind = "pdf" | "markdown" | "image" | "json" | "yaml" | "text" | "log" | "none";

/** Everything needed to fetch/download/preview one artifact, without re-deriving it from category strings at every call site. */
export interface ArtifactSource {
  paperId: string | null;
  knowledgeExtractionVersion: number | null;
  generatedProjectId: string | null;
  executionRunId: string | null;
  /** Project-relative path inside an execution run's `artifact_manifest`, for checkpoint/model/plot entries. */
  manifestPath: string | null;
}

export interface UnifiedArtifact {
  id: string;
  category: ArtifactCategory;
  stage: PipelineStage;
  fileName: string;
  /** Human-readable type label, e.g. "PDF", "JSON", "ZIP archive". */
  typeLabel: string;
  sizeBytes: number | null;
  createdAt: string;
  version: number | null;
  owner: string | null;
  contentType: string | null;
  previewKind: PreviewKind;
  /** Pre-fetched preview payload for artifacts whose content was already loaded during aggregation (parsed_data, graph snapshot, manifest listings) - avoids a second round trip. */
  inlinePreview: unknown | null;
  generationSource: string;
  relatedProject: string | null;
  relatedPaper: string | null;
  relatedGeneratedProject: string | null;
  relatedExecution: string | null;
  downloadHint: string | null;
  source: ArtifactSource;
}

export type ArtifactViewMode = "list" | "grid";
export type ArtifactGroupKey = "category" | "stage" | "none";
export type ArtifactSortKey = "created" | "name" | "size" | "version";
export type SortDirection = "asc" | "desc";

export interface ArtifactFilterState {
  search: string;
  categories: ArtifactCategory[];
  stages: PipelineStage[];
  minSizeBytes: number | null;
  maxSizeBytes: number | null;
  afterDate: string | null;
}

export const DEFAULT_ARTIFACT_FILTERS: ArtifactFilterState = {
  search: "",
  categories: [],
  stages: [],
  minSizeBytes: null,
  maxSizeBytes: null,
  afterDate: null,
};
