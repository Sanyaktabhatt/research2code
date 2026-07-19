import { CATEGORY_CONFIG } from "@/features/artifacts-center/lib/category-config";
import type { ArtifactFilterState, ArtifactSortKey, SortDirection, UnifiedArtifact } from "@/features/artifacts-center/types";

export function filterArtifacts(artifacts: UnifiedArtifact[], filters: ArtifactFilterState): UnifiedArtifact[] {
  const needle = filters.search.trim().toLowerCase();
  const afterTime = filters.afterDate ? new Date(filters.afterDate).getTime() : null;

  return artifacts.filter((artifact) => {
    if (filters.categories.length > 0 && !filters.categories.includes(artifact.category)) return false;
    if (filters.stages.length > 0 && !filters.stages.includes(artifact.stage)) return false;
    if (filters.minSizeBytes !== null && (artifact.sizeBytes ?? 0) < filters.minSizeBytes) return false;
    if (filters.maxSizeBytes !== null && (artifact.sizeBytes ?? Infinity) > filters.maxSizeBytes) return false;
    if (afterTime !== null && new Date(artifact.createdAt).getTime() < afterTime) return false;

    if (needle.length === 0) return true;
    const haystack = [
      artifact.fileName,
      artifact.typeLabel,
      artifact.stage,
      CATEGORY_CONFIG[artifact.category].label,
      artifact.version !== null ? `v${artifact.version}` : "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function sortArtifacts(artifacts: UnifiedArtifact[], key: ArtifactSortKey, direction: SortDirection): UnifiedArtifact[] {
  const sorted = [...artifacts].sort((a, b) => {
    switch (key) {
      case "created":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name":
        return a.fileName.localeCompare(b.fileName);
      case "size":
        return (a.sizeBytes ?? -1) - (b.sizeBytes ?? -1);
      case "version":
        return (a.version ?? -1) - (b.version ?? -1);
    }
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}

export function groupByCategory(artifacts: UnifiedArtifact[]): Map<string, UnifiedArtifact[]> {
  const groups = new Map<string, UnifiedArtifact[]>();
  for (const artifact of artifacts) {
    const label = CATEGORY_CONFIG[artifact.category].label;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(artifact);
  }
  return groups;
}

export function groupByStage(artifacts: UnifiedArtifact[]): Map<string, UnifiedArtifact[]> {
  const groups = new Map<string, UnifiedArtifact[]>();
  for (const artifact of artifacts) {
    if (!groups.has(artifact.stage)) groups.set(artifact.stage, []);
    groups.get(artifact.stage)!.push(artifact);
  }
  return groups;
}
