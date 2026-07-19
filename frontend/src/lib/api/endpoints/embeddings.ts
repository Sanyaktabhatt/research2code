import { apiFetch } from "@/lib/api/client";
import type { EmbeddingStatusInfo } from "@/types/domain";

export async function getEmbeddingStatus(paperId: string): Promise<EmbeddingStatusInfo> {
  return apiFetch<EmbeddingStatusInfo>(`/papers/${paperId}/embeddings/status`);
}

export async function triggerPaperEmbeddings(paperId: string): Promise<void> {
  await apiFetch(`/papers/${paperId}/embeddings`, { method: "POST" });
}
