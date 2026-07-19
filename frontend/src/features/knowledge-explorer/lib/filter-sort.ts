import type { CategoryId, EntitySource, EntityTypeGroup, NormalizedEntity } from "@/features/knowledge-explorer/types";

export interface KnowledgeFiltersState {
  search: string;
  /** 0-1 */
  confidenceMin: number;
  /** 0-1 */
  confidenceMax: number;
  categories: CategoryId[];
  typeGroups: EntityTypeGroup[];
}

export const DEFAULT_FILTERS: KnowledgeFiltersState = {
  search: "",
  confidenceMin: 0,
  confidenceMax: 1,
  categories: [],
  typeGroups: [],
};

export type SortKey = "confidence" | "alphabetical" | "source_page";

export function filterEntities(entities: NormalizedEntity[], filters: KnowledgeFiltersState): NormalizedEntity[] {
  const query = filters.search.trim().toLowerCase();

  return entities.filter((entity) => {
    if (filters.categories.length > 0 && !filters.categories.includes(entity.category)) return false;
    if (filters.typeGroups.length > 0 && !filters.typeGroups.includes(entity.typeGroup)) return false;
    if (entity.confidence < filters.confidenceMin || entity.confidence > filters.confidenceMax) return false;
    if (query && !entity.name.toLowerCase().includes(query) && !entity.categoryLabel.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function sortEntities(entities: NormalizedEntity[], sortKey: SortKey, sourceById: Map<string, EntitySource>): NormalizedEntity[] {
  const copy = [...entities];
  switch (sortKey) {
    case "confidence":
      return copy.sort((a, b) => b.confidence - a.confidence);
    case "alphabetical":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "source_page":
      return copy.sort((a, b) => {
        const pageA = sourceById.get(a.id)?.pageNumber ?? Number.POSITIVE_INFINITY;
        const pageB = sourceById.get(b.id)?.pageNumber ?? Number.POSITIVE_INFINITY;
        return pageA - pageB;
      });
  }
}
