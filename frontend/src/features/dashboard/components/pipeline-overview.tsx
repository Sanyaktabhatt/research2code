"use client";

import { StatusDistributionChart, type StatusDistributionDatum } from "@/components/charts/status-distribution-chart";
import { EmptyState } from "@/components/feedback/empty-state";
import { useRecentProjectsSuspense } from "@/features/dashboard/api/use-dashboard-data";
import { projectStatusToStage } from "@/lib/utils/status-mapping";
import type { ProjectStatus } from "@/types/domain";
import { Share2 } from "lucide-react";

const STATUS_ORDER: ProjectStatus[] = ["created", "processing", "completed", "failed"];
const STATUS_LABEL: Record<ProjectStatus, string> = {
  created: "Created",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export function PipelineOverview() {
  const { data } = useRecentProjectsSuspense();

  if (data.items.length === 0) {
    return <EmptyState icon={Share2} title="No projects yet" description="Status distribution appears once you create a project." />;
  }

  const counts = new Map<ProjectStatus, number>();
  for (const project of data.items) {
    counts.set(project.status, (counts.get(project.status) ?? 0) + 1);
  }

  const chartData: StatusDistributionDatum[] = STATUS_ORDER.filter((status) => (counts.get(status) ?? 0) > 0).map(
    (status) => ({
      label: STATUS_LABEL[status],
      count: counts.get(status) ?? 0,
      stage: projectStatusToStage(status),
    }),
  );

  return (
    <div>
      <StatusDistributionChart data={chartData} />
      {data.total > data.items.length && (
        <p className="mt-2 text-xs text-muted-foreground">
          Based on the {data.items.length} most recently created of {data.total} projects.
        </p>
      )}
    </div>
  );
}
