import { apiFetch, apiFetchOrNull } from "@/lib/api/client";
import type {
  GeneratedProject,
  GeneratedProjectDetail,
  GeneratedProjectDownloadResponse,
  GeneratedProjectStatus,
} from "@/types/domain";

export async function listRecentGeneratedProjects(
  limit = 10,
  statuses?: GeneratedProjectStatus[],
): Promise<GeneratedProject[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  statuses?.forEach((status) => params.append("statuses", status));
  return apiFetch<GeneratedProject[]>(`/generated-projects/recent?${params.toString()}`);
}

export async function listGeneratedProjectsForPaper(paperId: string): Promise<GeneratedProject[]> {
  return apiFetch<GeneratedProject[]>(`/papers/${paperId}/generated-projects`);
}

/** Null when code generation hasn't been triggered for this paper yet. */
export async function getLatestGeneratedProject(paperId: string): Promise<GeneratedProjectDetail | null> {
  return apiFetchOrNull<GeneratedProjectDetail>(`/papers/${paperId}/generated-projects/latest`, [404]);
}

export async function getGeneratedProjectVersion(paperId: string, version: number): Promise<GeneratedProjectDetail | null> {
  return apiFetchOrNull<GeneratedProjectDetail>(`/papers/${paperId}/generated-projects/${version}`, [404]);
}

/** A short-lived presigned URL to the project's ZIP archive in object storage. */
export async function getGeneratedProjectDownloadUrl(
  generatedProjectId: string,
  expiresInSeconds = 3600,
): Promise<GeneratedProjectDownloadResponse> {
  return apiFetch<GeneratedProjectDownloadResponse>(
    `/generated-projects/${generatedProjectId}/download?expires_in_seconds=${expiresInSeconds}`,
  );
}
