"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentProjectsSuspense } from "@/features/dashboard/api/use-dashboard-data";
import { usePipelineTracker } from "@/features/workspace/api/use-pipeline-tracker";
import { useUploadPaper } from "@/features/workspace/api/use-workspace-actions";
import { ApiError } from "@/lib/api/error";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";
import type { PipelineStageInfo } from "@/features/workspace/types";

const MAX_PDF_MB = 50;

interface NextStep {
  title: string;
  body: string;
  /** Link to act on; omitted while the pipeline is busy on its own. */
  action?: { label: string; href: string };
  busy?: boolean;
  upload?: boolean;
}

function nextStep(projectId: string, stages: PipelineStageInfo[], hasPaper: boolean): NextStep {
  const base = `/projects/${projectId}`;
  const by = (id: string) => stages.find((s) => s.id === id)?.status;
  const failed = stages.find((s) => s.status === "error");

  if (!hasPaper) {
    return { title: "Add the paper", body: "Drop the PDF here. Parsing and indexing start on their own.", upload: true };
  }
  if (failed) {
    return { title: `${failed.label} failed`, body: "Open the project to see what went wrong and retry.", action: { label: "Open project", href: base } };
  }
  const running = stages.find((s) => s.status === "running");
  if (running) {
    return {
      title: `${running.label} in progress`,
      body: "This runs in the background. You can leave this page; it keeps going.",
      busy: true,
      action: { label: "Watch progress", href: base },
    };
  }
  if (by("knowledge_extraction") !== "success") {
    return {
      title: "Extract the methodology",
      body: "The paper is parsed and indexed. Pull out its datasets, architecture and hyperparameters next.",
      action: { label: "Extract knowledge", href: base },
    };
  }
  if (by("code_generation") !== "success") {
    return {
      title: "Generate the project",
      body: "Turn the extracted methodology into a versioned PyTorch project you can read and diff.",
      action: { label: "Generate code", href: base },
    };
  }
  if (by("completed") !== "success") {
    return {
      title: "Start a training run",
      body: "Run the generated project in Docker with MLflow and TensorBoard tracking.",
      action: { label: "Start a run", href: base },
    };
  }
  return { title: "Run complete", body: "Review metrics, logs and checkpoints from the latest run.", action: { label: "View results", href: `${base}/runs` } };
}

function UploadZone({ projectId }: { projectId: string }) {
  const upload = useUploadPaper(projectId);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const send = (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported.");
      return;
    }
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      toast.error(`The limit is ${MAX_PDF_MB} MB.`);
      return;
    }
    upload.mutate(file, {
      onSuccess: () => toast.success("Paper uploaded. Parsing has started."),
      onError: (error) => toast.error(ApiError.isApiError(error) ? error.detail : "Upload failed. Please try again."),
    });
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-label="Upload paper PDF"
        onChange={(e) => {
          send(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          send(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "group flex w-full items-center justify-center gap-3 border border-dashed px-5 py-6 text-sm transition-colors duration-200",
          dragging ? "border-foreground bg-[hsl(var(--highlight)/0.25)]" : "border-border-strong hover:border-foreground hover:bg-muted/60",
        )}
      >
        {upload.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="size-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
        )}
        <span className="font-medium">{upload.isPending ? "Uploading…" : dragging ? "Drop the PDF" : "Drop a PDF here, or click to browse"}</span>
      </button>
    </>
  );
}

/** "Continue where you left off": the latest project's pipeline at a glance and the one thing to do next. */
export function ContinuePanel() {
  const { data } = useRecentProjectsSuspense();
  const project = [...data.items].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
  const { stages, isLoading, paper } = usePipelineTracker(project?.id ?? "");

  if (!project) return null;

  const done = stages.filter((s) => s.status === "success").length;
  const step = nextStep(project.id, stages, Boolean(paper));

  return (
    <section className="border border-border bg-card" aria-labelledby="continue-heading">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Continue where you left off</p>
          <h2 id="continue-heading" className="mt-1 truncate text-xl font-semibold tracking-tight">
            <Link href={`/projects/${project.id}`} className="underline-offset-4 hover:underline">
              {project.name}
            </Link>
          </h2>
          {paper && <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{paper.original_filename}</p>}
        </div>
        <p className="shrink-0 font-mono text-xs text-muted-foreground">
          {done} of {stages.length} stages · updated {formatRelativeTime(project.updated_at)}
        </p>
      </div>

      <div className="px-6 pt-5">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <ol className="grid grid-cols-5 gap-1.5 sm:grid-cols-10" aria-label="Pipeline stages">
            {stages.map((stage, i) => (
              <li key={stage.id} className="min-w-0" title={stage.label}>
                <div
                  className={cn(
                    "h-1.5 origin-left",
                    stage.status === "success" && "grow-x bg-foreground",
                    stage.status === "running" && "animate-pulse bg-foreground/60",
                    stage.status === "error" && "bg-destructive",
                    stage.status === "pending" && "bg-border",
                  )}
                  style={{ "--i": i } as React.CSSProperties}
                />
                <p
                  className={cn(
                    "mt-2 truncate text-[11px]",
                    stage.status === "pending" ? "text-muted-foreground/70" : "font-medium text-foreground",
                  )}
                >
                  {stage.label}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="grid gap-5 px-6 pb-6 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
        <div>
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            {step.busy && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
            Next: {step.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        </div>
        <div className="md:justify-self-end md:w-full md:max-w-sm">
          {step.upload ? (
            <UploadZone projectId={project.id} />
          ) : step.action ? (
            <Button asChild size="lg" variant={step.busy ? "outline" : "default"} className="group w-full md:w-auto md:float-right">
              <Link href={step.action.href}>
                {step.action.label}
                <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
