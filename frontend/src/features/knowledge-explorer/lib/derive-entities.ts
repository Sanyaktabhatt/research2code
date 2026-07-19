import { truncate } from "@/lib/utils/formatters";
import { CATEGORY_CONFIG } from "@/features/knowledge-explorer/types";
import type { NormalizedEntity } from "@/features/knowledge-explorer/types";
import type { ExtractedKnowledgeData } from "@/features/paper-viewer/types";

function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

/**
 * Flattens the 18 categories of backend/app/agents/schemas.py::ExtractedKnowledge
 * into one normalized, uniformly-displayable entity list. Every entity
 * genuinely carries `confidence` (ConfidenceMixin) - only the display
 * `name`/`searchTerm` are derived here, since not every entity type has a
 * literal "name" field (e.g. Limitation only has `description`).
 */
export function deriveEntities(extracted: ExtractedKnowledgeData, extractionVersion: number): NormalizedEntity[] {
  const entities: NormalizedEntity[] = [];

  function push(
    category: keyof typeof CATEGORY_CONFIG,
    index: number,
    name: string,
    searchTerm: string,
    confidence: number,
    raw: unknown,
  ) {
    const config = CATEGORY_CONFIG[category];
    entities.push({
      id: `${category}-${index}`,
      category,
      categoryLabel: config.label,
      typeGroup: config.typeGroup,
      name,
      searchTerm,
      confidence,
      raw: asRecord(raw),
      extractionVersion,
    });
  }

  if (extracted.metadata) {
    push("metadata", 0, extracted.metadata.title, extracted.metadata.title, extracted.metadata.confidence, extracted.metadata);
  }
  if (extracted.task_domain) {
    push(
      "task_domain",
      0,
      `${extracted.task_domain.task} · ${extracted.task_domain.domain}`,
      extracted.task_domain.task,
      extracted.task_domain.confidence,
      extracted.task_domain,
    );
  }
  extracted.datasets.forEach((d, i) => push("datasets", i, d.name, d.name, d.confidence, d));
  extracted.preprocessing_steps.forEach((p, i) => push("preprocessing", i, p.name, p.name, p.confidence, p));
  if (extracted.model_architecture) {
    push(
      "model_architecture",
      0,
      extracted.model_architecture.name,
      extracted.model_architecture.name,
      extracted.model_architecture.confidence,
      extracted.model_architecture,
    );
    extracted.model_architecture.layers.forEach((l, i) => push("layers", i, l.name, l.name, l.confidence, l));
  }
  extracted.hyperparameters.forEach((h, i) => push("hyperparameters", i, `${h.name} = ${h.value}`, h.name, h.confidence, h));
  if (extracted.optimizer) {
    push("optimizer", 0, extracted.optimizer.name, extracted.optimizer.name, extracted.optimizer.confidence, extracted.optimizer);
  }
  if (extracted.scheduler) {
    push("scheduler", 0, extracted.scheduler.name, extracted.scheduler.name, extracted.scheduler.confidence, extracted.scheduler);
  }
  extracted.loss_functions.forEach((l, i) => push("loss_functions", i, l.name, l.name, l.confidence, l));
  extracted.augmentations.forEach((a, i) => push("augmentations", i, a.name, a.name, a.confidence, a));
  extracted.hardware_requirements.forEach((hw, i) =>
    push(
      "hardware",
      i,
      hw.model_name ? `${hw.device_type} (${hw.model_name})` : hw.device_type,
      hw.model_name ?? hw.device_type,
      hw.confidence,
      hw,
    ),
  );
  extracted.evaluation_metrics.forEach((m, i) => push("evaluation_metrics", i, m.name, m.name, m.confidence, m));
  extracted.reported_results.forEach((r, i) => push("results", i, `${r.metric_name}: ${r.value}`, r.metric_name, r.confidence, r));
  extracted.ablation_studies.forEach((a, i) => push("ablation_studies", i, a.variant, a.variant, a.confidence, a));
  extracted.limitations.forEach((l, i) => push("limitations", i, truncate(l.description, 60), l.description.slice(0, 24), l.confidence, l));
  extracted.future_work.forEach((f, i) => push("future_work", i, truncate(f.description, 60), f.description.slice(0, 24), f.confidence, f));
  extracted.external_resources.forEach((e, i) => push("external_resources", i, e.name, e.name, e.confidence, e));

  return entities;
}
