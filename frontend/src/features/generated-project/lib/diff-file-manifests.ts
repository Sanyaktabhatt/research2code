export interface FileManifestDiff {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: string[];
}

/** Path-level diff between two versions' unzipped file maps - the basis for Version Comparison's changed/added/removed lists. */
export function diffFileManifests(base: Map<string, string>, compare: Map<string, string>): FileManifestDiff {
  const added: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const [path, content] of compare) {
    if (!base.has(path)) {
      added.push(path);
    } else if (base.get(path) !== content) {
      changed.push(path);
    } else {
      unchanged.push(path);
    }
  }

  const removed = [...base.keys()].filter((path) => !compare.has(path));

  return {
    added: added.sort(),
    removed: removed.sort(),
    changed: changed.sort(),
    unchanged: unchanged.sort(),
  };
}
