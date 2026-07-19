import type { ExtractedKnowledgeData } from "@/features/paper-viewer/types";

/**
 * The 4 files the LLM actually writes (backend/app/agents/embedding_targets.py's
 * counterpart in codegen: `app/codegen/llm_codegen.py`) - every other path in
 * `_PYTORCH_MANIFEST` (project_builder.py) is a static Jinja template.
 */
const LLM_GENERATED_FILES = new Set(["model.py", "dataset.py", "losses.py", "metrics.py"]);

export function generationSourceLabel(path: string): string {
  return LLM_GENERATED_FILES.has(path) ? "LLM-generated" : "Template";
}

/**
 * `optimizer.py`/`scheduler.py`/`dataloader.py` literally interpolate
 * `optimizer.name`/`scheduler.name`/`dataset.name` via
 * `project_builder.py::_build_template_context`. The 4 LLM-generated files
 * aren't templated from single fields - `llm_codegen.py` hands the model
 * the whole `ExtractedKnowledge` - so their mapping here names the entity
 * each file is topically about, not a literal template binding.
 */
export function relatedEntityNames(path: string, extracted: ExtractedKnowledgeData | null): string[] {
  if (!extracted) return [];

  switch (path) {
    case "model.py":
      return extracted.model_architecture ? [extracted.model_architecture.name] : [];
    case "dataset.py":
    case "dataloader.py":
      return extracted.datasets.map((d) => d.name);
    case "optimizer.py":
      return extracted.optimizer ? [extracted.optimizer.name] : [];
    case "scheduler.py":
      return extracted.scheduler ? [extracted.scheduler.name] : [];
    case "losses.py":
      return extracted.loss_functions.map((l) => l.name);
    case "metrics.py":
      return extracted.evaluation_metrics.map((m) => m.name);
    default:
      return [];
  }
}
