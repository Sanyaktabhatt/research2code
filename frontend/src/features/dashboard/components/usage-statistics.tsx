"use client";

import { AnimatedCounter } from "@/components/ui/animated-counter";
import {
  useRecentExecutionRunsSuspense,
  useRecentGeneratedProjectsSuspense,
  useRecentPapersSuspense,
  useRecentProjectsSuspense,
} from "@/features/dashboard/api/use-dashboard-data";

const SAMPLE_LIMIT = 50;

/** Four headline numbers in one quiet strip. */
export function UsageStatistics() {
  const { data: projects } = useRecentProjectsSuspense();
  const { data: papers } = useRecentPapersSuspense(SAMPLE_LIMIT);
  const { data: generatedProjects } = useRecentGeneratedProjectsSuspense(SAMPLE_LIMIT);
  const { data: executionRuns } = useRecentExecutionRunsSuspense(SAMPLE_LIMIT);

  const stats = [
    { label: "Projects", value: projects.total, capped: false },
    { label: "Papers", value: papers.length, capped: papers.length >= SAMPLE_LIMIT },
    { label: "Generated projects", value: generatedProjects.length, capped: generatedProjects.length >= SAMPLE_LIMIT },
    { label: "Runs", value: executionRuns.length, capped: executionRuns.length >= SAMPLE_LIMIT },
  ];

  return (
    <dl className="grid grid-cols-2 border border-border bg-card lg:grid-cols-4">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={[
            "px-5 py-4",
            i % 2 === 1 ? "border-l border-border" : "",
            i >= 2 ? "border-t border-border lg:border-t-0" : "",
            i === 2 ? "lg:border-l" : "",
          ].join(" ")}
        >
          <dt className="text-xs text-muted-foreground">{stat.label}</dt>
          <dd className="mt-1 text-[1.75rem] font-semibold leading-none tracking-[-0.03em] tabular-nums">
            <AnimatedCounter value={stat.value} />
            {stat.capped && "+"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
