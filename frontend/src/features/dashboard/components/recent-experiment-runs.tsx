"use client";

import { FlaskConical } from "lucide-react";
import { StageBadge } from "@/components/ui/stage-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { useRecentExecutionRunsSuspense } from "@/features/dashboard/api/use-dashboard-data";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { executionRunStatusToStage } from "@/lib/utils/status-mapping";

export function RecentExperimentRuns() {
  const { data: executionRuns } = useRecentExecutionRunsSuspense(6);

  if (executionRuns.length === 0) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No experiment runs yet"
        description="Trigger a run on a generated project to see it here."
      />
    );
  }

  return (
    <ul className="-mx-5 -mb-5 -mt-4 divide-y divide-border">
      {executionRuns.map((run) => (
        <li key={run.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {run.device.toUpperCase()} · v{run.version}
              {run.exit_code !== null && <span className="text-muted-foreground"> · exit {run.exit_code}</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {run.started_at ? `Started ${formatRelativeTime(run.started_at)}` : `Queued ${formatRelativeTime(run.created_at)}`}
            </p>
          </div>
          <StageBadge status={executionRunStatusToStage(run.status)} label={run.status} />
        </li>
      ))}
    </ul>
  );
}
