"use client";

import { FileText, FlaskConical, FolderKanban, Workflow } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import {
  useRecentExecutionRunsSuspense,
  useRecentGeneratedProjectsSuspense,
  useRecentPapersSuspense,
  useRecentProjectsSuspense,
} from "@/features/dashboard/api/use-dashboard-data";

const SAMPLE_LIMIT = 50;

function countLabel(count: number): string {
  return count >= SAMPLE_LIMIT ? `${count}+` : String(count);
}

export function UsageStatistics() {
  const { data: projects } = useRecentProjectsSuspense();
  const { data: papers } = useRecentPapersSuspense(SAMPLE_LIMIT);
  const { data: generatedProjects } = useRecentGeneratedProjectsSuspense(SAMPLE_LIMIT);
  const { data: executionRuns } = useRecentExecutionRunsSuspense(SAMPLE_LIMIT);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total projects" value={projects.total} icon={FolderKanban} accent="blue" />
      <StatCard label="Papers tracked" value={countLabel(papers.length)} icon={FileText} accent="cyan" />
      <StatCard label="Generated projects" value={countLabel(generatedProjects.length)} icon={Workflow} accent="violet" />
      <StatCard label="Execution runs" value={countLabel(executionRuns.length)} icon={FlaskConical} accent="orange" />
    </div>
  );
}
