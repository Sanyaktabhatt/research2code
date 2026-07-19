import { apiFetch, apiFetchOrNull } from "@/lib/api/client";
import type {
  ComparisonResult,
  ExecutionRun,
  ExecutionRunDetail,
  ExecutionRunStatus,
  LogDownloadResponse,
  TensorBoardUrlResponse,
} from "@/types/domain";

export async function listRecentExecutionRuns(
  limit = 10,
  statuses?: ExecutionRunStatus[],
): Promise<ExecutionRun[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  statuses?.forEach((status) => params.append("statuses", status));
  return apiFetch<ExecutionRun[]>(`/execution-runs/recent?${params.toString()}`);
}

export async function listExecutionRunsForGeneratedProject(generatedProjectId: string): Promise<ExecutionRun[]> {
  return apiFetch<ExecutionRun[]>(`/generated-projects/${generatedProjectId}/execution-runs`);
}

/** Null when no execution run has been triggered for this generated project yet. */
export async function getLatestExecutionRun(generatedProjectId: string): Promise<ExecutionRunDetail | null> {
  return apiFetchOrNull<ExecutionRunDetail>(`/generated-projects/${generatedProjectId}/execution-runs/latest`, [404]);
}

export async function triggerExecutionRun(generatedProjectId: string, device: "cpu" | "gpu" = "cpu"): Promise<ExecutionRun> {
  return apiFetch<ExecutionRun>(`/generated-projects/${generatedProjectId}/execution-runs`, {
    method: "POST",
    body: { device },
  });
}

export async function getExecutionRunVersion(generatedProjectId: string, version: number): Promise<ExecutionRunDetail | null> {
  return apiFetchOrNull<ExecutionRunDetail>(`/generated-projects/${generatedProjectId}/execution-runs/${version}`, [404]);
}

export async function cancelExecutionRun(executionRunId: string): Promise<ExecutionRun> {
  return apiFetch<ExecutionRun>(`/execution-runs/${executionRunId}/cancel`, { method: "POST" });
}

export async function getExecutionRunLogDownloadUrl(executionRunId: string, expiresInSeconds = 3600): Promise<LogDownloadResponse> {
  return apiFetch<LogDownloadResponse>(`/execution-runs/${executionRunId}/logs/download?expires_in_seconds=${expiresInSeconds}`);
}

/** Null when this run has no TensorBoard log directory (e.g. it never reached RUNNING). */
export async function getExecutionRunTensorboardUrl(executionRunId: string): Promise<TensorBoardUrlResponse | null> {
  return apiFetchOrNull<TensorBoardUrlResponse>(`/execution-runs/${executionRunId}/tensorboard`, [404, 409]);
}

export async function compareExecutionRuns(
  executionRunIds: string[],
  options?: { primaryMetric?: string; higherIsBetter?: boolean },
): Promise<ComparisonResult> {
  return apiFetch<ComparisonResult>("/execution-runs/compare", {
    method: "POST",
    body: {
      execution_run_ids: executionRunIds,
      primary_metric: options?.primaryMetric ?? null,
      higher_is_better: options?.higherIsBetter ?? true,
    },
  });
}
