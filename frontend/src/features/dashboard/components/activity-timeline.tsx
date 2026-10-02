"use client";

import { FileText, FlaskConical, Folder, FolderCode } from "lucide-react";
import { ActivityFeed, type ActivityFeedItem } from "@/components/ui/activity-feed";
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

  const items: ActivityFeedItem[] = [
    ...projects.items.slice(0, 10).map((project) => ({
      id: `project-${project.id}`,
      icon: Folder,
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
      icon: FolderCode,
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
    return <EmptyState icon={Folder} title="No activity yet" description="Recent events across your projects will show up here." />;
  }

  // Bleeds to the SectionCard edges so separators and hover rows span the full card width.
  return <ActivityFeed items={items} className="-mx-5 -mb-5 -mt-4 [--feed-inset:1.25rem]" />;
}
