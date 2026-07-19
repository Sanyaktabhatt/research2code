"use client";

import * as React from "react";
import { Boxes, FlaskConical, Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useTriggerExecutionRun,
  useTriggerKnowledgeExtraction,
  useTriggerPaperEmbeddings,
  useUploadPaper,
} from "@/features/workspace/api/use-workspace-actions";
import { ApiError } from "@/lib/api/error";
import type { GeneratedProject, Paper } from "@/types/domain";

interface QuickActionsProps {
  projectId: string;
  paper: Paper | undefined;
  generatedProject: GeneratedProject | null | undefined;
}

function errorMessage(error: unknown): string {
  return ApiError.isApiError(error) ? error.detail : "Something went wrong.";
}

/** Real mutations against the backend's trigger endpoints - not just navigation links. */
export function QuickActions({ projectId, paper, generatedProject }: QuickActionsProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadPaper(projectId);
  const extractMutation = useTriggerKnowledgeExtraction(paper?.id ?? "");
  const embedMutation = useTriggerPaperEmbeddings(paper?.id ?? "");
  const runMutation = useTriggerExecutionRun(generatedProject?.id ?? "");

  const paperParsed = paper?.status === "completed";
  const canRun = generatedProject?.status === "completed";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    uploadMutation.mutate(file, {
      onSuccess: () => toast.success("Paper uploaded, parsing queued."),
      onError: (error) => toast.error(errorMessage(error)),
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
      <Button
        size="sm"
        variant="outline"
        disabled={uploadMutation.isPending}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploadMutation.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
        {paper ? "Upload new version" : "Upload paper"}
      </Button>

      <Button
        size="sm"
        variant="outline"
        disabled={!paperParsed || extractMutation.isPending}
        onClick={() =>
          extractMutation.mutate(undefined, {
            onSuccess: () => toast.success("Knowledge extraction queued."),
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      >
        {extractMutation.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
        Extract knowledge
      </Button>

      <Button
        size="sm"
        variant="outline"
        disabled={!paperParsed || embedMutation.isPending}
        onClick={() =>
          embedMutation.mutate(undefined, {
            onSuccess: () => toast.success("Embedding generation queued."),
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      >
        {embedMutation.isPending ? <Loader2 className="animate-spin" /> : <Boxes />}
        Generate embeddings
      </Button>

      <Button
        size="sm"
        variant="outline"
        disabled={!canRun || runMutation.isPending}
        onClick={() =>
          runMutation.mutate("cpu", {
            onSuccess: () => toast.success("Execution run queued."),
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      >
        {runMutation.isPending ? <Loader2 className="animate-spin" /> : <FlaskConical />}
        Trigger execution run
      </Button>
    </div>
  );
}
