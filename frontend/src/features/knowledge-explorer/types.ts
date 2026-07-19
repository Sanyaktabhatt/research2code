export const CATEGORY_IDS = [
  "metadata",
  "task_domain",
  "datasets",
  "preprocessing",
  "model_architecture",
  "layers",
  "hyperparameters",
  "optimizer",
  "scheduler",
  "loss_functions",
  "augmentations",
  "hardware",
  "evaluation_metrics",
  "results",
  "ablation_studies",
  "limitations",
  "future_work",
  "external_resources",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type EntityTypeGroup = "documentation" | "data" | "architecture" | "training" | "evaluation" | "infrastructure";

export const CATEGORY_CONFIG: Record<CategoryId, { label: string; typeGroup: EntityTypeGroup }> = {
  metadata: { label: "Metadata", typeGroup: "documentation" },
  task_domain: { label: "Task & Domain", typeGroup: "documentation" },
  datasets: { label: "Datasets", typeGroup: "data" },
  preprocessing: { label: "Preprocessing", typeGroup: "data" },
  model_architecture: { label: "Model Architecture", typeGroup: "architecture" },
  layers: { label: "Layers", typeGroup: "architecture" },
  hyperparameters: { label: "Hyperparameters", typeGroup: "training" },
  optimizer: { label: "Optimizer", typeGroup: "training" },
  scheduler: { label: "Scheduler", typeGroup: "training" },
  loss_functions: { label: "Loss Functions", typeGroup: "training" },
  augmentations: { label: "Augmentations", typeGroup: "training" },
  hardware: { label: "Hardware", typeGroup: "infrastructure" },
  evaluation_metrics: { label: "Evaluation Metrics", typeGroup: "evaluation" },
  results: { label: "Results", typeGroup: "evaluation" },
  ablation_studies: { label: "Ablation Studies", typeGroup: "evaluation" },
  limitations: { label: "Limitations", typeGroup: "documentation" },
  future_work: { label: "Future Work", typeGroup: "documentation" },
  external_resources: { label: "External Resources", typeGroup: "documentation" },
};

export const TYPE_GROUP_LABELS: Record<EntityTypeGroup, string> = {
  documentation: "Documentation",
  data: "Data",
  architecture: "Architecture",
  training: "Training",
  evaluation: "Evaluation",
  infrastructure: "Infrastructure",
};

export interface EntitySource {
  sectionName: string | null;
  sectionLabel: string | null;
  pageNumber: number | null;
  citation: string | null;
}

export interface RelatedEntities {
  datasets: string[];
  models: string[];
  metrics: string[];
  losses: string[];
  optimizers: string[];
}

export interface NormalizedEntity {
  /** Stable within one extraction version: `${category}-${indexWithinCategory}`. */
  id: string;
  category: CategoryId;
  categoryLabel: string;
  typeGroup: EntityTypeGroup;
  /** Display label - may be composite (e.g. "beta1 = 0.9"). */
  name: string;
  /** The bare identifying token used for literal text search against the paper (e.g. "beta1"). */
  searchTerm: string;
  confidence: number;
  raw: Record<string, unknown>;
  extractionVersion: number;
  /** Only set while comparing two versions. */
  diffStatus?: VersionDiffStatus;
}

export type VersionDiffStatus = "added" | "removed" | "modified" | "unchanged";
