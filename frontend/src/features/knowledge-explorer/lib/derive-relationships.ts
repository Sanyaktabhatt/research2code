import type { EntitySource, NormalizedEntity, RelatedEntities } from "@/features/knowledge-explorer/types";

/**
 * The extraction has no real cross-entity graph, so "relatedness" is
 * derived the same honest way as source mapping: two entities are related
 * when they co-occur in the same real source section. Scoped to the five
 * categories the spec calls out (datasets/models/metrics/losses/optimizers)
 * since those are the ones with a clear, singular "this is the thing" name.
 */
export function deriveRelatedEntities(
  entity: NormalizedEntity,
  allEntities: NormalizedEntity[],
  sourceById: Map<string, EntitySource>,
): RelatedEntities {
  const ownSection = sourceById.get(entity.id)?.sectionName ?? null;

  const related: RelatedEntities = { datasets: [], models: [], metrics: [], losses: [], optimizers: [] };
  if (!ownSection) return related;

  for (const candidate of allEntities) {
    if (candidate.id === entity.id) continue;
    const candidateSection = sourceById.get(candidate.id)?.sectionName ?? null;
    if (candidateSection !== ownSection) continue;

    if (candidate.category === "datasets") related.datasets.push(candidate.name);
    else if (candidate.category === "model_architecture") related.models.push(candidate.name);
    else if (candidate.category === "evaluation_metrics") related.metrics.push(candidate.name);
    else if (candidate.category === "loss_functions") related.losses.push(candidate.name);
    else if (candidate.category === "optimizer") related.optimizers.push(candidate.name);
  }

  return related;
}
