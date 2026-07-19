import type { ExecutionRun } from "@/types/domain";

export interface EnrichedRun extends ExecutionRun {
  generatedProjectVersion: number;
  framework: string;
  knowledgeExtractionVersion: number | null;
  /** Runs are versioned per generated project (a retry is a new version, never a mutated row) - this counts how many attempts preceded this one for the same generated project. */
  retryCount: number;
  durationSeconds: number | null;
}

export type RunSortKey = "started_at" | "duration" | "status" | "version";
export type SortDirection = "asc" | "desc";

export interface RunFilterState {
  search: string;
  statuses: ExecutionRun["status"][];
  devices: ExecutionRun["device"][];
}

export const DEFAULT_RUN_FILTERS: RunFilterState = {
  search: "",
  statuses: [],
  devices: [],
};
