/**
 * Mirrors backend/app/parser/schemas.py (ParsedPaper) and
 * backend/app/agents/schemas.py (ExtractedKnowledge) field-for-field.
 * KnowledgeExtractionDetail.extracted_data / Paper's parsed_data are typed
 * loosely (Record<string, unknown>) in types/domain.ts since most features
 * don't need their internals - this feature does, so it narrows locally.
 */

export const SECTION_NAMES = [
  "title",
  "abstract",
  "introduction",
  "methodology",
  "experiments",
  "results",
  "references",
] as const;

export type SectionName = (typeof SECTION_NAMES)[number];

export const SECTION_LABELS: Record<SectionName, string> = {
  title: "Title",
  abstract: "Abstract",
  introduction: "Introduction",
  methodology: "Methodology",
  experiments: "Experiments",
  results: "Results",
  references: "References",
};

export interface PageContent {
  page_number: number;
  text: string;
  used_ocr: boolean;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ParsedSection {
  name: string;
  text: string;
  start_page: number | null;
  end_page: number | null;
}

export interface FigureRef {
  page_number: number;
  index: number;
  caption: string | null;
  bbox: BoundingBox | null;
}

export interface TableRef {
  page_number: number;
  index: number;
  caption: string | null;
  raw_text: string | null;
}

export interface EquationRef {
  page_number: number;
  index: number;
  text: string;
}

export interface ParsedPaper {
  pages: PageContent[];
  sections: ParsedSection[];
  figures: FigureRef[];
  tables: TableRef[];
  equations: EquationRef[];
  page_count: number;
  ocr_page_count: number;
}

export interface ConfidenceEntity {
  confidence: number;
}

export interface PaperMetadataEntity extends ConfidenceEntity {
  title: string;
  authors: string[];
  publication_year: number | null;
  venue: string | null;
  arxiv_id: string | null;
  doi: string | null;
}

export interface TaskDomainEntity extends ConfidenceEntity {
  task: string;
  domain: string;
  subdomain: string | null;
}

export interface DatasetEntity extends ConfidenceEntity {
  name: string;
  description: string | null;
  size: string | null;
  url: string | null;
  split_info: string | null;
}

export interface PreprocessingStepEntity extends ConfidenceEntity {
  name: string;
  description: string;
}

export interface ModelLayerEntity extends ConfidenceEntity {
  name: string;
  layer_type: string | null;
  description: string | null;
}

export interface ModelArchitectureEntity extends ConfidenceEntity {
  name: string;
  family: string | null;
  description: string | null;
  num_parameters: string | null;
  layers: ModelLayerEntity[];
}

export interface HyperparameterEntity extends ConfidenceEntity {
  name: string;
  value: string;
}

export interface OptimizerEntity extends ConfidenceEntity {
  name: string;
  learning_rate: string | null;
  weight_decay: string | null;
  other_params: Record<string, string>;
}

export interface SchedulerEntity extends ConfidenceEntity {
  name: string;
  description: string | null;
}

export interface LossFunctionEntity extends ConfidenceEntity {
  name: string;
  description: string | null;
}

export interface AugmentationEntity extends ConfidenceEntity {
  name: string;
  description: string | null;
}

export interface HardwareRequirementEntity extends ConfidenceEntity {
  device_type: string;
  model_name: string | null;
  count: number | null;
  memory: string | null;
}

export interface EvaluationMetricEntity extends ConfidenceEntity {
  name: string;
  description: string | null;
}

export interface ReportedResultEntity extends ConfidenceEntity {
  metric_name: string;
  value: string;
  dataset: string | null;
  split: string | null;
  notes: string | null;
}

export interface AblationStudyEntity extends ConfidenceEntity {
  variant: string;
  description: string;
  result: string | null;
}

export interface LimitationEntity extends ConfidenceEntity {
  description: string;
}

export interface FutureWorkEntity extends ConfidenceEntity {
  description: string;
}

export interface ExternalResourceEntity extends ConfidenceEntity {
  name: string;
  resource_type: string;
  url: string | null;
  description: string | null;
}

/** Mirrors backend/app/agents/schemas.py::ExtractedKnowledge field-for-field. */
export interface ExtractedKnowledgeData {
  metadata: PaperMetadataEntity | null;
  task_domain: TaskDomainEntity | null;
  datasets: DatasetEntity[];
  preprocessing_steps: PreprocessingStepEntity[];
  model_architecture: ModelArchitectureEntity | null;
  hyperparameters: HyperparameterEntity[];
  optimizer: OptimizerEntity | null;
  scheduler: SchedulerEntity | null;
  loss_functions: LossFunctionEntity[];
  augmentations: AugmentationEntity[];
  hardware_requirements: HardwareRequirementEntity[];
  evaluation_metrics: EvaluationMetricEntity[];
  reported_results: ReportedResultEntity[];
  ablation_studies: AblationStudyEntity[];
  limitations: LimitationEntity[];
  future_work: FutureWorkEntity[];
  external_resources: ExternalResourceEntity[];
}

export type FocusSelection =
  | { kind: "page"; pageNumber: number }
  | { kind: "section"; name: string; startPage: number | null; endPage: number | null }
  | { kind: "figure"; pageNumber: number; index: number; caption: string | null }
  | { kind: "table"; pageNumber: number; index: number; caption: string | null }
  | { kind: "equation"; pageNumber: number; index: number; text: string };

export type FitMode = "width" | "page" | "custom";
