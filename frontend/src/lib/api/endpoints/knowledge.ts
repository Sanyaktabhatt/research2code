import { apiFetch, apiFetchOrNull } from "@/lib/api/client";
import type { KnowledgeExtraction, KnowledgeExtractionDetail } from "@/types/domain";

export async function listKnowledgeExtractions(paperId: string): Promise<KnowledgeExtraction[]> {
  return apiFetch<KnowledgeExtraction[]>(`/papers/${paperId}/knowledge-extractions`);
}

/** Null when no extraction has ever been triggered for this paper (expected state, not an error). */
export async function getLatestKnowledgeExtraction(paperId: string): Promise<KnowledgeExtractionDetail | null> {
  return apiFetchOrNull<KnowledgeExtractionDetail>(`/papers/${paperId}/knowledge-extractions/latest`, [404]);
}

export async function getKnowledgeExtractionVersion(paperId: string, version: number): Promise<KnowledgeExtractionDetail | null> {
  return apiFetchOrNull<KnowledgeExtractionDetail>(`/papers/${paperId}/knowledge-extractions/${version}`, [404]);
}

export async function triggerKnowledgeExtraction(paperId: string): Promise<KnowledgeExtraction> {
  return apiFetch<KnowledgeExtraction>(`/papers/${paperId}/knowledge-extractions`, { method: "POST" });
}
