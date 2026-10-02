"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProject } from "@/features/projects/api/use-projects";
import { ApiError } from "@/lib/api/error";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const createProject = useCreateProject();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const project = await createProject.mutateAsync({ name, description: description || undefined });
      router.push(`/projects/${project.id}`);
    } catch {
      // Surfaced below via createProject.isError - no rethrow needed.
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">New project</h1>
          <p className="page-description">Name the project you&apos;ll upload a paper into.</p>
        </div>
      </div>

      <form className="rounded-lg border border-border bg-card shadow-xs" onSubmit={handleSubmit}>
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">Project details</h2>
        </div>
        <div className="space-y-5 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Attention Is All You Need" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">
              Description <span className="font-normal text-muted-foreground">– optional</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this paper about?"
              rows={3}
            />
          </div>
          {createProject.isError && (
            <p role="alert" className="rounded-md border border-destructive/30 border-l-4 border-l-destructive bg-destructive/[0.05] px-3 py-2 text-sm text-destructive">
              {ApiError.isApiError(createProject.error) ? createProject.error.detail : "Couldn't create the project. Please try again."}
            </p>
          )}
        </div>

        <div className="flex justify-end border-t border-border bg-muted/40 px-5 py-3">
          <Button type="submit" disabled={createProject.isPending}>
            {createProject.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {createProject.isPending ? "Creating…" : "Create project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
