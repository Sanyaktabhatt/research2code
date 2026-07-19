"use client";

import * as React from "react";
import { Crown, Trophy, X, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatDuration } from "@/lib/utils/formatters";
import { useRunComparison } from "@/features/experiments/api/use-run-comparison";
import type { EnrichedRun } from "@/features/experiments/types";

interface RunComparisonProps {
  runs: EnrichedRun[];
  onRemove: (runId: string) => void;
}

interface RowProps {
  label: string;
  children: React.ReactNode;
}

function Row({ label, children }: RowProps) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="sticky left-0 whitespace-nowrap bg-background py-2 pr-4 text-xs font-medium text-muted-foreground">{label}</td>
      {children}
    </tr>
  );
}

/** Selecting two or more RunCards feeds this - real per-run fields (hardware/version/duration) are compared client-side, parameters/metrics come from the backend's own `/execution-runs/compare` endpoint. */
export function RunComparison({ runs, onRemove }: RunComparisonProps) {
  const { result, isLoading } = useRunComparison(runs.map((r) => r.id));

  const fastestId = React.useMemo(() => {
    const completed = runs.filter((r) => r.durationSeconds !== null && r.status === "completed");
    if (completed.length === 0) return null;
    return completed.reduce((best, r) => (r.durationSeconds! < best.durationSeconds! ? r : best)).id;
  }, [runs]);

  if (runs.length < 2) {
    return <EmptyState icon={Zap} title="Select two or more runs" description="Check the box on at least two run cards to compare them." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {runs.map((run) => (
          <Badge key={run.id} variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1">
            v{run.version}
            <button type="button" onClick={() => onRemove(run.id)} aria-label={`Remove v${run.version} from comparison`} className="rounded-full p-0.5 hover:bg-background/60">
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 bg-background py-2 pr-4 text-left text-xs font-medium text-muted-foreground">Run</th>
              {runs.map((run) => {
                const failed = run.status === "failed" || run.status === "cancelled";
                return (
                  <th key={run.id} className={cn("px-3 py-2 text-left text-xs font-medium", failed && "bg-destructive/10")}>
                    <div className="flex items-center gap-1.5">
                      v{run.version}
                      {run.id === fastestId && (
                        <span title="Fastest run">
                          <Zap className="size-3.5 text-warning" />
                        </span>
                      )}
                      {result?.best_run_id === run.id && (
                        <span title={`Best ${result.best_metric ?? "metric"}`}>
                          <Trophy className="size-3.5 text-success" />
                        </span>
                      )}
                      {failed && <Badge variant="destructive">{run.status}</Badge>}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <Row label="Status">
              {runs.map((run) => (
                <td key={run.id} className="px-3 py-2 text-xs">
                  {run.status}
                </td>
              ))}
            </Row>
            <Row label="Started">
              {runs.map((run) => (
                <td key={run.id} className="px-3 py-2 text-xs">
                  {run.started_at ? formatDateTime(run.started_at) : "—"}
                </td>
              ))}
            </Row>
            <Row label="Duration">
              {runs.map((run) => (
                <td key={run.id} className={cn("px-3 py-2 text-xs", run.id === fastestId && "font-semibold text-warning")}>
                  {run.durationSeconds !== null ? formatDuration(run.durationSeconds) : "—"}
                </td>
              ))}
            </Row>
            <Row label="Hardware">
              {runs.map((run) => (
                <td key={run.id} className="px-3 py-2 text-xs">
                  {run.device.toUpperCase()} · {run.execution_backend}
                </td>
              ))}
            </Row>
            <Row label="Generated project">
              {runs.map((run) => (
                <td key={run.id} className="px-3 py-2 text-xs">
                  v{run.generatedProjectVersion}
                </td>
              ))}
            </Row>
            <Row label="Knowledge extraction">
              {runs.map((run) => (
                <td key={run.id} className="px-3 py-2 text-xs">
                  {run.knowledgeExtractionVersion !== null ? `v${run.knowledgeExtractionVersion}` : "—"}
                </td>
              ))}
            </Row>

            {isLoading && (
              <tr>
                <td colSpan={runs.length + 1} className="py-4">
                  <CardSkeleton />
                </td>
              </tr>
            )}

            {result?.parameter_diffs
              .filter((diff) => diff.differs)
              .map((diff) => (
                <Row key={diff.key} label={diff.key}>
                  {runs.map((run) => (
                    <td key={run.id} className="px-3 py-2 font-mono text-xs">
                      {diff.values[run.id] ?? "—"}
                    </td>
                  ))}
                </Row>
              ))}

            {result?.metric_diffs.map((diff) => (
              <Row key={diff.key} label={diff.key}>
                {runs.map((run) => {
                  const isBest = result.best_metric === diff.key && result.best_run_id === run.id;
                  return (
                    <td key={run.id} className={cn("px-3 py-2 font-mono text-xs", isBest && "font-semibold text-success")}>
                      <span className="inline-flex items-center gap-1">
                        {isBest && <Crown className="size-3" />}
                        {diff.values[run.id] ?? "—"}
                      </span>
                    </td>
                  );
                })}
              </Row>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
