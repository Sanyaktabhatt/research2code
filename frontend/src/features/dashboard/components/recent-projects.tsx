"use client";

import Link from "next/link";
import { ArrowUpRight, FolderGit2 } from "lucide-react";
import { StageBadge } from "@/components/ui/stage-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { useRecentProjectsSuspense } from "@/features/dashboard/api/use-dashboard-data";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { projectStatusToStage } from "@/lib/utils/status-mapping";

export function RecentProjects() {
  const { data } = useRecentProjectsSuspense();
  const projects = [...data.items]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  if (projects.length === 0) {
    return (
      <EmptyState icon={FolderGit2} title="No projects yet" description="Create a project to get started." />
    );
  }

  return (
    <ul className="-mx-5 -mb-5 -mt-4 divide-y divide-border">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/projects/${project.id}`}
            className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-accent/60"
          >
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium">{project.name}</p>
              <p className="text-xs text-muted-foreground">Updated {formatRelativeTime(project.updated_at)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StageBadge status={projectStatusToStage(project.status)} label={project.status} />
              <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
