"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadPaper } from "@/lib/api/endpoints/papers";
import { triggerKnowledgeExtraction } from "@/lib/api/endpoints/knowledge";
import { triggerPaperEmbeddings } from "@/lib/api/endpoints/embeddings";
import { triggerExecutionRun } from "@/lib/api/endpoints/execution-runs";
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
