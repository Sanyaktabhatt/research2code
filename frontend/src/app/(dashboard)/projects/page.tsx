"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderGit2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StageBadge } from "@/components/ui/stage-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { useProjects } from "@/features/projects/api/use-projects";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { projectStatusToStage } from "@/lib/utils/status-mapping";
import type { Project } from "@/types/domain";

export default function ProjectsPage() {
  const router = useRouter();
  const { data, isLoading } = useProjects(1, 50);
  const projects = data?.items ?? [];

  const columns: DataTableColumn<Project>[] = [
    {
      id: "name",
      header: "Project",
      cell: (project) => (
        <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
          {project.name}
        </Link>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (project) => <StageBadge status={projectStatusToStage(project.status)} label={project.status} />,
    },
    {
      id: "updatedAt",
      header: "Updated",
      cell: (project) => <span className="text-muted-foreground">{formatRelativeTime(project.updated_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Papers you&apos;ve turned into reproducible ML projects.</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus />
            New project
          </Link>
        </Button>
      </div>

      {!isLoading && projects.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No projects yet"
          description="Upload a paper to kick off parsing, knowledge extraction, and code generation."
          action={
            <Button asChild size="sm">
              <Link href="/projects/new">
                <Plus />
                New project
              </Link>
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={projects}
          getRowId={(p) => p.id}
          isLoading={isLoading}
          onRowClick={(project) => router.push(`/projects/${project.id}`)}
        />
      )}
    </div>
  );
}
