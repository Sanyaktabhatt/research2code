"use client";

import Link from "next/link";
import { FolderGit2 } from "lucide-react";
import { StageBadge } from "@/components/ui/stage-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { useRecentProjectsSuspense } from "@/features/dashboard/api/use-dashboard-data";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { projectStatusToStage } from "@/lib/utils/status-mapping";

export function RecentProjects() {
  const { data } = useRecentProjectsSuspense();
  const projects = [...data.items]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  if (projects.length === 0) {
    return (
      <EmptyState icon={FolderGit2} title="No projects yet" description="Create a project to get started." />
    );
  }

  return (
    <ul className="space-y-1">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/projects/${project.id}`}
            className="flex items-center justify-between gap-3 rounded-md px-2.5 py-2 transition-colors duration-100 hover:bg-accent/50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{project.name}</p>
              <p className="text-xs text-muted-foreground">Updated {formatRelativeTime(project.updated_at)}</p>
            </div>
            <StageBadge status={projectStatusToStage(project.status)} label={project.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
