import type {
  ExecutionRunStatus,
  GeneratedProjectStatus,
  KnowledgeExtractionStatus,
  PaperStatus,
  PipelineStageStatus,
  ProjectStatus,
} from "@/types/domain";

/**
 * Every backend resource has its own status enum (see types/domain.ts).
 * StageBadge and other shared status UI speak one normalized vocabulary
 * instead of each widget hand-rolling its own switch statement.
 */
export function projectStatusToStage(status: ProjectStatus): PipelineStageStatus {
  switch (status) {
    case "created":
      return "pending";
    case "processing":
      return "running";
    case "completed":
      return "success";
    case "failed":
      return "error";
  }
}

export function paperStatusToStage(status: PaperStatus): PipelineStageStatus {
  switch (status) {
    case "pending":
      return "pending";
    case "processing":
      return "running";
    case "completed":
      return "success";
    case "failed":
      return "error";
  }
}

export function knowledgeExtractionStatusToStage(status: KnowledgeExtractionStatus): PipelineStageStatus {
  switch (status) {
    case "pending":
      return "pending";
    case "processing":
      return "running";
    case "completed":
      return "success";
    case "failed":
      return "error";
  }
}

export function generatedProjectStatusToStage(status: GeneratedProjectStatus): PipelineStageStatus {
  switch (status) {
    case "pending":
      return "pending";
    case "generating":
    case "validating":
      return "running";
    case "completed":
      return "success";
    case "failed":
      return "error";
  }
}

export function executionRunStatusToStage(status: ExecutionRunStatus): PipelineStageStatus {
  switch (status) {
    case "queued":
      return "pending";
    case "running":
      return "running";
    case "completed":
      return "success";
    case "failed":
    case "cancelled":
      return "error";
  }
}

export const ACTIVE_GENERATED_PROJECT_STATUSES: GeneratedProjectStatus[] = [
  "pending",
  "generating",
  "validating",
];

export const ACTIVE_EXECUTION_RUN_STATUSES: ExecutionRunStatus[] = ["queued", "running"];
