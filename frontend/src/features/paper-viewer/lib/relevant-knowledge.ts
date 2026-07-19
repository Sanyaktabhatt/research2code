import type { ExtractedKnowledgeData } from "@/features/paper-viewer/types";

export interface RelevantKnowledge {
  entities: string[];
  datasets: string[];
  models: string[];
  metrics: string[];
  losses: string[];
  optimizers: string[];
  /** False when nothing in the section's text matched, so the full paper-wide extraction is shown instead. */
  scopedToSection: boolean;
}

function textContains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * The backend's knowledge extraction is paper-wide - no entity is tagged
 * with the section it came from. As a real (not fabricated) proxy for
 * "relevant to this section," this checks whether each entity's name
 * literally appears in the selected section's extracted text, falling
 * back to the full extraction when nothing overlaps (e.g. a short
 * Abstract) rather than showing an empty panel.
 */
export function deriveRelevantKnowledge(
  extracted: ExtractedKnowledgeData | null,
  sectionText: string | null,
): RelevantKnowledge | null {
  if (!extracted) return null;

  const entities = [extracted.task_domain?.task, extracted.task_domain?.domain, extracted.model_architecture?.family].filter(
    (v): v is string => Boolean(v),
  );
  const datasets = extracted.datasets.map((d) => d.name);
  const models = extracted.model_architecture ? [extracted.model_architecture.name] : [];
  const metrics = extracted.evaluation_metrics.map((m) => m.name);
  const losses = extracted.loss_functions.map((l) => l.name);
  const optimizers = extracted.optimizer ? [extracted.optimizer.name] : [];

  if (!sectionText) {
    return { entities, datasets, models, metrics, losses, optimizers, scopedToSection: false };
  }

  const scoped = {
    entities: entities.filter((v) => textContains(sectionText, v)),
    datasets: datasets.filter((v) => textContains(sectionText, v)),
    models: models.filter((v) => textContains(sectionText, v)),
    metrics: metrics.filter((v) => textContains(sectionText, v)),
    losses: losses.filter((v) => textContains(sectionText, v)),
    optimizers: optimizers.filter((v) => textContains(sectionText, v)),
  };

  const hasAnyScopedMatch = Object.values(scoped).some((list) => list.length > 0);
  if (!hasAnyScopedMatch) {
    return { entities, datasets, models, metrics, losses, optimizers, scopedToSection: false };
  }

  return { ...scoped, scopedToSection: true };
}
