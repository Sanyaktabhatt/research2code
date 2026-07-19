import { Progress } from "@/components/ui/progress";
import { SectionCard } from "@/components/ui/section-card";
import { StageBadge } from "@/components/ui/stage-badge";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils/formatters";
import { executionRunStatusToStage } from "@/lib/utils/status-mapping";
import type { MetricsPoint } from "@/features/experiments/api/use-execution-stream";
import type { EnrichedRun } from "@/features/experiments/types";
import type { ExecutionRunStatus } from "@/types/domain";

interface RunDetailsProps {
  run: EnrichedRun;
  liveStatus: ExecutionRunStatus | null;
  latestMetrics: MetricsPoint | null;
}

interface FieldProps {
  label: string;
  value: React.ReactNode;
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 truncate text-sm">{value}</div>
    </div>
  );
}

function computeProgressFraction(metrics: MetricsPoint | null): number | null {
  if (!metrics || metrics.epoch === null || !metrics.totalEpochs) return null;
  const intraEpoch = metrics.step && metrics.totalSteps ? metrics.step / metrics.totalSteps : 0;
  return Math.min(1, (metrics.epoch + intraEpoch) / metrics.totalEpochs);
}

export function RunDetails({ run, liveStatus, latestMetrics }: RunDetailsProps) {
  const status = liveStatus ?? run.status;
  const progressFraction = computeProgressFraction(latestMetrics);
  const elapsedSeconds = latestMetrics?.elapsedSeconds ?? run.durationSeconds;

  return (
    <SectionCard title="Run details" description={`Execution v${run.version} of generated project v${run.generatedProjectVersion}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge status={executionRunStatusToStage(status)} label={status} />
          {run.retryCount > 0 && <Badge variant="secondary">Attempt {run.retryCount + 1}</Badge>}
          {run.exit_code !== null && (
            <Badge variant={run.exit_code === 0 ? "success" : "destructive"}>Exit code {run.exit_code}</Badge>
          )}
        </div>

        {progressFraction !== null && (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Epoch {latestMetrics!.epoch}/{latestMetrics!.totalEpochs}
                {latestMetrics!.step !== null && latestMetrics!.totalSteps && ` · step ${latestMetrics!.step}/${latestMetrics!.totalSteps}`}
              </span>
              <span>{Math.round(progressFraction * 100)}%</span>
            </div>
            <Progress value={progressFraction * 100} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <Field label="Elapsed" value={elapsedSeconds !== null ? formatDuration(elapsedSeconds) : "—"} />
          <Field label="Est. remaining" value={latestMetrics?.etaSeconds != null ? formatDuration(latestMetrics.etaSeconds) : "—"} />
          <Field label="Exit code" value={run.exit_code ?? "—"} />
          <Field label="Retry count" value={run.retryCount} />
          <Field label="Hardware" value={`${run.device.toUpperCase()} · ${run.execution_backend}`} />
          <Field label="Framework" value={run.framework} />
        </div>
      </div>
    </SectionCard>
  );
}
