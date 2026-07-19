"use client";

import { FileText, FlaskConical, FolderGit2, Sparkles } from "lucide-react";
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total projects" value={projects.total} icon={FolderGit2} />
      <StatCard label="Papers tracked" value={countLabel(papers.length)} icon={FileText} />
      <StatCard label="Generated projects" value={countLabel(generatedProjects.length)} icon={Sparkles} />
      <StatCard label="Execution runs" value={countLabel(executionRuns.length)} icon={FlaskConical} />
    </div>
  );
}
