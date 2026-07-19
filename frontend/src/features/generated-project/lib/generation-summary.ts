import type { ExtractedKnowledgeData } from "@/features/paper-viewer/types";
import type { GeneratedProjectDetail } from "@/types/domain";

export interface GenerationSummaryData {
  framework: string;
  datasets: string[];
  optimizer: string | null;
  scheduler: string | null;
  lossFunctions: string[];
  metrics: string[];
  mixedPrecision: boolean;
  distributedTraining: boolean;
  /** Not a `GenerationOptions` flag (checkpointing is unconditional) - derived from whether the callback file was actually generated. */
  checkpointing: boolean;
  tensorboard: boolean;
  mlflow: boolean;
}

export function deriveGenerationSummary(
  project: GeneratedProjectDetail,
  extracted: ExtractedKnowledgeData | null,
): GenerationSummaryData {
  const manifest = project.file_manifest ?? [];

  return {
    framework: project.framework,
    datasets: extracted?.datasets.map((d) => d.name) ?? [],
    optimizer: extracted?.optimizer?.name ?? null,
    scheduler: extracted?.scheduler?.name ?? null,
    lossFunctions: extracted?.loss_functions.map((l) => l.name) ?? [],
    metrics: extracted?.evaluation_metrics.map((m) => m.name) ?? [],
    mixedPrecision: project.generation_params.use_amp,
    distributedTraining: project.generation_params.use_ddp,
    checkpointing: manifest.some((path) => path.includes("checkpoint")),
    tensorboard: project.generation_params.use_tensorboard,
    mlflow: project.generation_params.use_mlflow,
  };
}
