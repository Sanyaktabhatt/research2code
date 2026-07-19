"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { StageBadge } from "@/components/ui/stage-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { useRecentPapersSuspense } from "@/features/dashboard/api/use-dashboard-data";
import { formatBytes, formatRelativeTime } from "@/lib/utils/formatters";
import { paperStatusToStage } from "@/lib/utils/status-mapping";

export function RecentPapers() {
  const { data: papers } = useRecentPapersSuspense(6);

  if (papers.length === 0) {
    return (
      <EmptyState icon={FileText} title="No papers uploaded yet" description="Upload a paper to a project to see it here." />
    );
  }

  return (
    <ul className="space-y-1">
      {papers.map((paper) => (
        <li key={paper.id}>
          <Link
            href={`/projects/${paper.project_id}/papers/${paper.id}`}
            className="flex items-center justify-between gap-3 rounded-md px-2.5 py-2 transition-colors duration-100 hover:bg-accent/50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{paper.original_filename}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(paper.size_bytes)} · {formatRelativeTime(paper.created_at)}
              </p>
            </div>
            <StageBadge status={paperStatusToStage(paper.status)} label={paper.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
