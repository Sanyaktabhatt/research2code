import { toast } from "sonner";
import { getKnowledgeExtractionVersion } from "@/lib/api/endpoints/knowledge";
import { getGeneratedProjectDownloadUrl } from "@/lib/api/endpoints/generated-projects";
import { getExecutionRunLogDownloadUrl } from "@/lib/api/endpoints/execution-runs";
import { downloadFromUrl, downloadTextFile } from "@/features/generated-project/lib/download-file";
import type { UnifiedArtifact } from "@/features/artifacts-center/types";

/**
 * Only two categories have a real per-artifact download endpoint
 * (generated-project ZIPs and execution logs); everything with an
 * already-fetched JSON payload (parsed output, knowledge extraction,
 * graph snapshot) exports that real data as a file client-side. Categories
 * with neither (checkpoints, exported models, plots, TensorBoard/MLflow
 * artifacts, the original paper PDF) have no working download - the
 * button stays disabled with `downloadHint` explaining why, rather than
 * faking one.
 */
export async function downloadArtifact(artifact: UnifiedArtifact): Promise<void> {
  try {
    switch (artifact.category) {
      case "generated_project": {
        if (!artifact.source.generatedProjectId) throw new Error("Missing generated project id");
        const { url } = await getGeneratedProjectDownloadUrl(artifact.source.generatedProjectId);
        downloadFromUrl(artifact.fileName, url);
        return;
      }
      case "execution_log": {
        if (!artifact.source.executionRunId) throw new Error("Missing execution run id");
        const { url } = await getExecutionRunLogDownloadUrl(artifact.source.executionRunId);
        downloadFromUrl(artifact.fileName, url);
        return;
      }
      case "parsed_output":
      case "knowledge_graph": {
        downloadTextFile(artifact.fileName, JSON.stringify(artifact.inlinePreview, null, 2), "application/json");
        return;
      }
      case "knowledge_extraction": {
        if (!artifact.source.paperId || artifact.source.knowledgeExtractionVersion === null) throw new Error("Missing knowledge extraction reference");
        const detail = await getKnowledgeExtractionVersion(artifact.source.paperId, artifact.source.knowledgeExtractionVersion);
        downloadTextFile(artifact.fileName, JSON.stringify(detail?.extracted_data ?? null, null, 2), "application/json");
        return;
      }
      default:
        toast.info(artifact.downloadHint ?? "No download is available for this artifact yet.");
    }
  } catch {
    toast.error(`Couldn't download ${artifact.fileName}.`);
  }
}

const DOWNLOADABLE_CATEGORIES = new Set(["generated_project", "execution_log", "parsed_output", "knowledge_graph", "knowledge_extraction"]);

export function canDownload(artifact: UnifiedArtifact): boolean {
  return DOWNLOADABLE_CATEGORIES.has(artifact.category);
}
