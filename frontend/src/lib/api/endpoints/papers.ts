import { apiFetch } from "@/lib/api/client";
import type { Paper, PaperDetail } from "@/types/domain";

export async function listRecentPapers(limit = 10): Promise<Paper[]> {
  return apiFetch<Paper[]>(`/papers/recent?limit=${limit}`);
}

export async function listPapersForProject(projectId: string): Promise<Paper[]> {
  return apiFetch<Paper[]>(`/projects/${projectId}/papers`);
}

export async function getPaper(projectId: string, paperId: string): Promise<PaperDetail> {
  return apiFetch<PaperDetail>(`/projects/${projectId}/papers/${paperId}`);
}

export async function uploadPaper(projectId: string, file: File): Promise<Paper> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<Paper>(`/projects/${projectId}/papers`, { method: "POST", body: formData });
}
