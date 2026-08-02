"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadPaper } from "@/lib/api/endpoints/papers";
import { triggerKnowledgeExtraction } from "@/lib/api/endpoints/knowledge";
import { triggerPaperEmbeddings } from "@/lib/api/endpoints/embeddings";
import { triggerExecutionRun } from "@/lib/api/endpoints/execution-runs";
import { queryOrchestrator } from "@/lib/api/endpoints/orchestrator";
import { queryKeys } from "@/lib/query/keys";

export function useUploadPaper(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadPaper(projectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.papers.list(projectId) });
    },
  });
}

export function useTriggerKnowledgeExtraction(paperId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => triggerKnowledgeExtraction(paperId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.latest(paperId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.list(paperId) });
    },
  });
}

export function useTriggerPaperEmbeddings(paperId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => triggerPaperEmbeddings(paperId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.embeddings.status(paperId) });
    },
  });
}

/**
 * There is deliberately no plain REST "trigger codegen" endpoint - every
 * generation request goes through the orchestrator's Planner (see
 * CodeGenerationService.trigger_generation's docstring) - so this drives
 * the orchestrator directly with `generate_full_project: true` rather than
 * hitting a codegen-specific route.
 */
export function useTriggerCodeGeneration(paperId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      queryOrchestrator({
        query: "Generate a full, downloadable project implementation of this paper.",
        paper_id: paperId,
        generate_full_project: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.codegen.latestForPaper(paperId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.codegen.forPaper(paperId) });
    },
  });
}

export function useTriggerExecutionRun(generatedProjectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (device: "cpu" | "gpu" = "cpu") => triggerExecutionRun(generatedProjectId, device),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.executionRuns.latestForGeneratedProject(generatedProjectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.executionRuns.forGeneratedProject(generatedProjectId) });
    },
  });
}
