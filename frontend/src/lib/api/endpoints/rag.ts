import { apiFetch } from "@/lib/api/client";
import type { RAGAnswer, RAGQueryRequest, WarmCacheResponse } from "@/types/domain";

export async function queryRag(payload: RAGQueryRequest): Promise<RAGAnswer> {
  return apiFetch<RAGAnswer>("/rag/query", { method: "POST", body: payload });
}

export async function warmRagCache(paperId: string, queries?: string[]): Promise<WarmCacheResponse> {
  return apiFetch<WarmCacheResponse>(`/papers/${paperId}/rag/warm-cache`, {
    method: "POST",
    body: queries ? { queries } : undefined,
  });
}
