import { apiFetch } from "@/lib/api/client";
import type { Project } from "@/types/domain";

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  page_size: number;
}

export async function listProjects(page = 1, pageSize = 20): Promise<ProjectListResponse> {
  return apiFetch<ProjectListResponse>(`/projects?page=${page}&page_size=${pageSize}`);
}

export async function getProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}`);
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  return apiFetch<Project>("/projects", { method: "POST", body: payload });
}
