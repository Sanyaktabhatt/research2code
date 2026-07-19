import type { UnifiedArtifact } from "@/features/artifacts-center/types";

export interface StorageSummaryData {
  totalArtifacts: number;
  storageUsedBytes: number;
  /** Only counts artifacts with a known size - many categories (JSON exports, execution manifests) never carry one since the backend doesn't report per-file sizes for them. */
  sizedArtifactCount: number;
  latest: UnifiedArtifact | null;
  largest: UnifiedArtifact | null;
}

export function buildStorageSummary(artifacts: UnifiedArtifact[]): StorageSummaryData {
  let storageUsedBytes = 0;
  let sizedArtifactCount = 0;
  let latest: UnifiedArtifact | null = null;
  let largest: UnifiedArtifact | null = null;

  for (const artifact of artifacts) {
    if (artifact.sizeBytes !== null) {
      storageUsedBytes += artifact.sizeBytes;
      sizedArtifactCount += 1;
      if (!largest || artifact.sizeBytes > (largest.sizeBytes ?? 0)) largest = artifact;
    }
    if (!latest || new Date(artifact.createdAt).getTime() > new Date(latest.createdAt).getTime()) latest = artifact;
  }

  return { totalArtifacts: artifacts.length, storageUsedBytes, sizedArtifactCount, latest, largest };
}
