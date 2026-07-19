import type { NormalizedEntity } from "@/features/knowledge-explorer/types";

function entityKey(entity: NormalizedEntity): string {
  return `${entity.category}::${entity.searchTerm.toLowerCase()}`;
}

function rawEquals(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Diffs two extraction versions' entity lists by category+identifying-term
 * (array index isn't a stable identity across versions, since additions
 * upstream shift every later index). Returns the "current" (compareTo)
 * version's entities tagged added/modified/unchanged, plus the base
 * version's entities that no longer exist, tagged removed - so the removed
 * ones can still be rendered (struck through) in their category.
 */
export function diffEntityVersions(base: NormalizedEntity[], compareTo: NormalizedEntity[]): NormalizedEntity[] {
  const baseByKey = new Map(base.map((e) => [entityKey(e), e]));
  const compareByKey = new Map(compareTo.map((e) => [entityKey(e), e]));

  const result: NormalizedEntity[] = compareTo.map((entity) => {
    const baseEntity = baseByKey.get(entityKey(entity));
    if (!baseEntity) return { ...entity, diffStatus: "added" };
    const unchanged = Math.abs(baseEntity.confidence - entity.confidence) < 0.005 && rawEquals(baseEntity.raw, entity.raw);
    return { ...entity, diffStatus: unchanged ? "unchanged" : "modified" };
  });

  for (const [key, baseEntity] of baseByKey) {
    if (!compareByKey.has(key)) {
      result.push({ ...baseEntity, diffStatus: "removed" });
    }
  }

  return result;
}
