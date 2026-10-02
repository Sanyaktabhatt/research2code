"use client";

import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, FileText, FlaskConical, FolderCode } from "lucide-react";
import { ActivityFeed, type ActivityFeedItem } from "@/components/ui/activity-feed";
import { EmptyState } from "@/components/feedback/empty-state";
import { ListSkeleton } from "@/components/feedback/skeletons";
import { listPapersForProject } from "@/lib/api/endpoints/papers";
import { listKnowledgeExtractions } from "@/lib/api/endpoints/knowledge";
import { listGeneratedProjectsForPaper } from "@/lib/api/endpoints/generated-projects";
import { listExecutionRunsForGeneratedProject } from "@/lib/api/endpoints/execution-runs";
import { queryKeys } from "@/lib/query/keys";
import {
  executionRunStatusToStage,
  generatedProjectStatusToStage,
  knowledgeExtractionStatusToStage,
} from "@/lib/utils/status-mapping";

const TONE_FOR_STAGE = {
  pending: "default" as const,
  running: "warning" as const,
  success: "success" as const,
  error: "destructive" as const,
};

interface ActivityTimelineProps {
  projectId: string;
}

export function ActivityTimeline({ projectId }: ActivityTimelineProps) {
  const papersQuery = useQuery({
    queryKey: queryKeys.papers.list(projectId),
    queryFn: () => listPapersForProject(projectId),
  });

  const paper = papersQuery.data?.[0];

  const knowledgeQuery = useQuery({
    queryKey: queryKeys.knowledge.list(paper?.id ?? ""),
    queryFn: () => listKnowledgeExtractions(paper!.id),
    enabled: Boolean(paper),
  });

  const generatedProjectsQuery = useQuery({
    queryKey: queryKeys.codegen.forPaper(paper?.id ?? ""),
    queryFn: () => listGeneratedProjectsForPaper(paper!.id),
    enabled: Boolean(paper),
  });

  const latestGeneratedProject = generatedProjectsQuery.data?.[0];

  const executionRunsQuery = useQuery({
    queryKey: queryKeys.executionRuns.forGeneratedProject(latestGeneratedProject?.id ?? ""),
    queryFn: () => listExecutionRunsForGeneratedProject(latestGeneratedProject!.id),
    enabled: Boolean(latestGeneratedProject),
  });

  if (papersQuery.isLoading) return <ListSkeleton rows={4} />;

  const items: ActivityFeedItem[] = [
    ...(paper
      ? [
          {
            id: `paper-${paper.id}`,
            icon: FileText,
            title: `Uploaded ${paper.original_filename}`,
            timestamp: paper.created_at,
            tone: TONE_FOR_STAGE.pending,
          },
        ]
      : []),
    ...(knowledgeQuery.data ?? []).map((extraction) => ({
      id: `knowledge-${extraction.id}`,
      icon: BrainCircuit,
      title: `Knowledge extraction v${extraction.version} ${extraction.status}`,
      timestamp: extraction.created_at,
      tone: TONE_FOR_STAGE[knowledgeExtractionStatusToStage(extraction.status)],
    })),
    ...(generatedProjectsQuery.data ?? []).map((project) => ({
      id: `codegen-${project.id}`,
      icon: FolderCode,
      title: `Generated project v${project.version} ${project.status}`,
      timestamp: project.created_at,
      tone: TONE_FOR_STAGE[generatedProjectStatusToStage(project.status)],
    })),
    ...(executionRunsQuery.data ?? []).map((run) => ({
      id: `run-${run.id}`,
      icon: FlaskConical,
      title: `Execution run v${run.version} ${run.status}`,
      timestamp: run.created_at,
      tone: TONE_FOR_STAGE[executionRunStatusToStage(run.status)],
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (items.length === 0) {
    return <EmptyState icon={FileText} title="No activity yet" description="Upload a paper to get started." />;
  }

  // Narrow side panel: stacked timestamps so titles aren't truncated; bleeds to the panel edges.
  return <ActivityFeed items={items} layout="stacked" className="-mx-4 border-t border-border [--feed-inset:1rem]" />;
}
