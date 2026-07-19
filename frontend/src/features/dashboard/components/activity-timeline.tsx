"use client";

import { Bot, FileText, FlaskConical, FolderGit2 } from "lucide-react";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  useRecentExecutionRunsSuspense,
  useRecentGeneratedProjectsSuspense,
  useRecentPapersSuspense,
  useRecentProjectsSuspense,
} from "@/features/dashboard/api/use-dashboard-data";

const TONE_FOR_STATUS = {
  success: "success" as const,
  completed: "success" as const,
  failed: "destructive" as const,
  running: "warning" as const,
  processing: "warning" as const,
  generating: "warning" as const,
  validating: "warning" as const,
  queued: "default" as const,
  pending: "default" as const,
  created: "default" as const,
  cancelled: "destructive" as const,
};

export function ActivityTimeline() {
  const { data: projects } = useRecentProjectsSuspense();
  const { data: papers } = useRecentPapersSuspense(10);
  const { data: generatedProjects } = useRecentGeneratedProjectsSuspense(10);
  const { data: executionRuns } = useRecentExecutionRunsSuspense(10);

  const items: TimelineItem[] = [
    ...projects.items.slice(0, 10).map((project) => ({
      id: `project-${project.id}`,
      icon: FolderGit2,
      title: `Project "${project.name}" ${project.status}`,
      timestamp: project.created_at,
      tone: TONE_FOR_STATUS[project.status],
    })),
    ...papers.map((paper) => ({
      id: `paper-${paper.id}`,
      icon: FileText,
      title: `Paper "${paper.original_filename}" uploaded`,
      description: `Parsing ${paper.status}`,
      timestamp: paper.created_at,
      tone: TONE_FOR_STATUS[paper.status],
    })),
    ...generatedProjects.map((project) => ({
      id: `codegen-${project.id}`,
      icon: Bot,
      title: `Generated project ${project.status} (v${project.version})`,
      description: project.framework,
      timestamp: project.created_at,
      tone: TONE_FOR_STATUS[project.status],
    })),
    ...executionRuns.map((run) => ({
      id: `run-${run.id}`,
      icon: FlaskConical,
      title: `Execution run ${run.status} (v${run.version})`,
      description: run.device.toUpperCase(),
      timestamp: run.created_at,
      tone: TONE_FOR_STATUS[run.status],
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 12);

  if (items.length === 0) {
    return <EmptyState icon={FolderGit2} title="No activity yet" description="Recent events across your projects will show up here." />;
  }

  return <Timeline items={items} />;
}
