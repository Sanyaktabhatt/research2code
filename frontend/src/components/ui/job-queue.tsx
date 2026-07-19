import Link from "next/link";
import { Loader2 } from "lucide-react";
import { StageBadge } from "@/components/ui/stage-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatRelativeTime } from "@/lib/utils/formatters";
import type { PipelineStageStatus } from "@/types/domain";

export interface JobQueueItem {
  id: string;
  kind: string;
  title: string;
  status: PipelineStageStatus;
  statusLabel: string;
  createdAt: string;
  /** Omitted when there's no resolvable route (e.g. the parent project id isn't in scope). */
  href?: string;
}

interface JobQueueProps {
  jobs: JobQueueItem[];
}

export function JobQueue({ jobs }: JobQueueProps) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Loader2}
        title="No active jobs"
        description="Codegen and execution runs in progress will show up here."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {jobs.map((job) => {
        const content = (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {job.kind}
                </span>
                <p className="truncate text-sm font-medium">{job.title}</p>
              </div>
              <div
                className="mt-2 h-1 w-full overflow-hidden rounded-full bg-primary/15 bg-[length:200%_100%] bg-gradient-to-r from-primary/20 via-primary to-primary/20 animate-shimmer"
                aria-label="In progress"
              />
              <p className="mt-1 text-xs text-muted-foreground">Started {formatRelativeTime(job.createdAt)}</p>
            </div>
            <StageBadge status={job.status} label={job.statusLabel} />
          </>
        );
        const className = "flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/50";

        return (
          <li key={`${job.kind}-${job.id}`}>
            {job.href ? (
              <Link href={job.href} className={className}>
                {content}
              </Link>
            ) : (
              <div className={className}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
