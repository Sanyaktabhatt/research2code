export type ArtifactCategory = "checkpoint" | "exported_model" | "tensorboard" | "plot" | "other";

export interface ArtifactEntry {
  path: string;
  category: ArtifactCategory;
}

const EXPORTED_MODEL_EXTENSIONS = [".onnx", ".pt", ".pth", ".safetensors", ".bin"];
const PLOT_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg"];

/**
 * `artifact_manifest` is a flat list of MinIO keys with no per-entry type
 * metadata (see backend/app/schemas/execution.py::ExecutionRunDetailRead) -
 * category is inferred from the same prefixes the backend itself writes
 * under (`checkpoints/`, `tensorboard/` - see sandbox_executor.py) or the
 * file extension, never invented.
 */
export function categorizeArtifact(path: string): ArtifactCategory {
  const lower = path.toLowerCase();
  if (lower.startsWith("checkpoints/")) {
    return EXPORTED_MODEL_EXTENSIONS.some((ext) => lower.endsWith(ext)) && !lower.includes("checkpoint")
      ? "exported_model"
      : "checkpoint";
  }
  if (lower.startsWith("tensorboard/")) return "tensorboard";
  if (PLOT_EXTENSIONS.some((ext) => lower.endsWith(ext))) return "plot";
  if (EXPORTED_MODEL_EXTENSIONS.some((ext) => lower.endsWith(ext))) return "exported_model";
  return "other";
}

export function groupArtifacts(manifest: string[]): Record<ArtifactCategory, ArtifactEntry[]> {
  const groups: Record<ArtifactCategory, ArtifactEntry[]> = {
    checkpoint: [],
    exported_model: [],
    tensorboard: [],
    plot: [],
    other: [],
  };
  for (const path of manifest) {
    const category = categorizeArtifact(path);
    groups[category].push({ path, category });
  }
  return groups;
}
