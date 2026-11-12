"use client";

import { JobQueue, type JobQueueItem } from "@/components/ui/job-queue";
import { useActiveJobsSuspense } from "@/features/dashboard/api/use-dashboard-data";
import {
  executionRunStatusToStage,
  generatedProjectStatusToStage,
} from "@/lib/utils/status-mapping";

export function RunningJobs() {
  const { generatedProjects, executionRuns } = useActiveJobsSuspense();

  // No project id is available on these resources (GeneratedProjectRead /
  // ExecutionRunRead only carry paper_id), so items aren't linkable yet -
  // that needs a project-id-bearing endpoint, which is out of scope here.
  const jobs: JobQueueItem[] = [
    ...generatedProjects.map((project) => ({
      id: project.id,
      kind: "codegen",
      title: `${project.framework} · v${project.version}`,
      status: generatedProjectStatusToStage(project.status),
      statusLabel: project.status,
      createdAt: project.created_at,
    })),
    ...executionRuns.map((run) => ({
      id: run.id,
      kind: "execution",
      title: `${run.device.toUpperCase()} run · v${run.version}`,
      status: executionRunStatusToStage(run.status),
      statusLabel: run.status,
      createdAt: run.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (jobs.length === 0) {
    // A one-liner rather than the full empty state - this sits in a narrow side column.
    return (
      <p className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="size-1.5 shrink-0 rounded-full bg-border-strong" aria-hidden="true" />
        Nothing running. Code generation and training runs appear here while they work.
      </p>
    );
  }

  return <JobQueue jobs={jobs} />;
}
