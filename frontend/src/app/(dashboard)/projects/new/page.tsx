"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProject } from "@/features/projects/api/use-projects";
import { uploadPaper } from "@/lib/api/endpoints/papers";
import { ApiError } from "@/lib/api/error";
import { cn } from "@/lib/utils/cn";

/** Mirrors the backend's MAX_PDF_SIZE_MB default (app/config/settings.py). */
const MAX_PDF_MB = 50;

const NEXT_STEPS = [
  { title: "Parse", body: "Sections, figures, tables and equations are pulled out of the PDF.", auto: true },
  { title: "Embed", body: "The paper is indexed for retrieval so the AI Assistant can answer with citations.", auto: true },
  { title: "Extract knowledge", body: "Datasets, architecture, hyperparameters and results, each with a confidence score.", auto: false },
  { title: "Generate and run", body: "A versioned PyTorch project, then a tracked training run in Docker.", auto: false },
];

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const createProject = useCreateProject();

  const pickFile = (candidate: File | undefined) => {
    if (!candidate) return;
    if (candidate.type !== "application/pdf" && !candidate.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Only PDF files are supported.");
      return;
    }
    if (candidate.size > MAX_PDF_MB * 1024 * 1024) {
      setFileError(`That file is ${formatSize(candidate.size)}. The limit is ${MAX_PDF_MB} MB.`);
      return;
    }
    setFileError(null);
    setFile(candidate);
    // Suggest a project name from the file when the user hasn't typed one.
    if (!name.trim()) {
      setName(
        candidate.name
          .replace(/\.pdf$/i, "")
          .replace(/[_-]+/g, " ")
          .trim(),
      );
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    let projectId: string;
    try {
      const project = await createProject.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      projectId = project.id;
    } catch {
      return; // Surfaced below via createProject.isError.
    }

    if (file) {
      setUploading(true);
      try {
        await uploadPaper(projectId, file);
        toast.success("Project created. Parsing has started.");
      } catch (error) {
        // The project exists either way - open it so the upload can be retried from its Overview tab.
        toast.error(
          `Project created, but the upload failed${ApiError.isApiError(error) ? `: ${error.detail}` : "."} You can upload it from the project.`,
        );
      } finally {
        setUploading(false);
      }
    } else {
      toast.success("Project created.");
    }
    router.push(`/projects/${projectId}`);
  };

  const busy = createProject.isPending || uploading;

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6">
        <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em]">New project</h1>
        <p className="mt-1 text-sm text-muted-foreground">Give it a name and add the paper you want to reproduce.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Adam optimizer on CIFAR-10"
              className="h-10 text-[15px]"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What do you want to reproduce from this paper?"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paper">
              Paper <span className="font-normal text-muted-foreground">(optional, PDF up to {MAX_PDF_MB} MB)</span>
            </Label>
            <input
              ref={inputRef}
              id="paper"
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {file ? (
              <div className="rise flex items-center gap-3 border border-foreground bg-card px-4 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center bg-foreground text-background">
                  <FileText className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{formatSize(file.size)} · parsing starts after you create the project</p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove file" onClick={() => setFile(null)} disabled={busy}>
                  <X />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "group flex w-full flex-col items-center justify-center gap-2 border border-dashed px-6 py-10 text-center transition-colors duration-200",
                  dragging ? "border-foreground bg-[hsl(var(--highlight)/0.25)]" : "border-border-strong hover:border-foreground hover:bg-muted/60",
                )}
              >
                <Upload
                  className={cn("size-5 text-muted-foreground transition-transform duration-200", dragging ? "-translate-y-1 text-foreground" : "group-hover:-translate-y-0.5")}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{dragging ? "Drop the PDF" : "Drop a PDF here, or click to browse"}</span>
                <span className="text-xs text-muted-foreground">You can also add papers later from the project.</span>
              </button>
            )}
            {fileError && (
              <p role="alert" className="text-sm text-destructive">
                {fileError}
              </p>
            )}
          </div>

          {createProject.isError && (
            <p role="alert" className="border border-destructive/30 border-l-4 border-l-destructive bg-destructive/[0.05] px-3 py-2 text-sm text-destructive">
              {ApiError.isApiError(createProject.error) ? createProject.error.detail : "Couldn't create the project. Please try again."}
            </p>
          )}

          <div className="flex items-center gap-3 border-t border-border pt-6">
            <Button type="submit" size="lg" disabled={busy || !name.trim()}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {createProject.isPending ? "Creating…" : uploading ? "Uploading paper…" : file ? "Create and upload" : "Create project"}
            </Button>
            <Button asChild type="button" variant="ghost" size="lg" disabled={busy}>
              <Link href="/projects">Cancel</Link>
            </Button>
          </div>
        </form>

        <aside className="h-fit border border-border bg-muted/40 p-6 sm:p-7" aria-labelledby="next-steps">
          <h2 id="next-steps" className="text-[15px] font-semibold text-foreground">
            What happens next
          </h2>
          <ol className="mt-5 border-t border-border">
            {NEXT_STEPS.map((step, i) => (
              <li key={step.title} className="rise flex gap-4 border-b border-border py-4" style={{ "--i": i + 1 } as React.CSSProperties}>
                <span className="pt-0.5 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <span
                      className={cn(
                        "shrink-0 px-1.5 font-mono text-[10.5px]",
                        step.auto ? "bg-[hsl(var(--highlight))] text-[#111]" : "border border-border text-muted-foreground",
                      )}
                    >
                      {step.auto ? "automatic" : "you start it"}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
