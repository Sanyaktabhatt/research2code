import type { UnifiedArtifact } from "@/features/artifacts-center/types";

/**
 * Every versioned category in this app is versioned relative to one parent
 * resource (a knowledge extraction/generated project/execution run is
 * versioned per paper or per generated project - see the backend's
 * `UniqueConstraint`s) - siblings are every other artifact of the same
 * category scoped to that same parent, so switching versions never mixes
 * two different papers' history together.
 */
export function findVersionSiblings(all: UnifiedArtifact[], selected: UnifiedArtifact): UnifiedArtifact[] {
  if (selected.version === null) return [];

  const scopeId =
    selected.category === "generated_project"
      ? selected.source.paperId
      : selected.category === "experiment_output"
        ? selected.source.generatedProjectId
        : selected.source.paperId;

  return all
    .filter((a) => a.category === selected.category && a.version !== null)
    .filter((a) => {
      const otherScopeId =
        a.category === "generated_project" ? a.source.paperId : a.category === "experiment_output" ? a.source.generatedProjectId : a.source.paperId;
      return otherScopeId === scopeId;
    })
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
}
