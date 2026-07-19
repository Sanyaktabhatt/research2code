import { apiFetchOrNull } from "@/lib/api/client";
import type { GraphSnapshot } from "@/types/domain";

/**
 * Null when the graph hasn't been built yet - either no completed knowledge
 * extraction exists (404) or the latest one hasn't finished (409). Both are
 * expected "not ready" states, not failures.
 */
export async function getPaperGraph(paperId: string): Promise<GraphSnapshot | null> {
  return apiFetchOrNull<GraphSnapshot>(`/papers/${paperId}/graph`, [404, 409]);
}
