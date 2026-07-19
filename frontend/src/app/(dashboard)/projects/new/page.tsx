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
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
        <p className="text-sm text-muted-foreground">Name the project you&apos;ll upload a paper into.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="name">Project name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Attention Is All You Need" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this paper about?"
            rows={3}
          />
        </div>
        {createProject.isError && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {ApiError.isApiError(createProject.error) ? createProject.error.detail : "Couldn't create the project. Please try again."}
          </p>
        )}

        <Button type="submit" disabled={createProject.isPending}>
          {createProject.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {createProject.isPending ? "Creating…" : "Create project"}
        </Button>
      </form>
    </div>
  );
}
