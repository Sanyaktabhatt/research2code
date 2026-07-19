import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { env } from "@/config/env";
import type { ExecutionRunDetail } from "@/types/domain";

interface MLflowCardProps {
  run: ExecutionRunDetail;
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-mono">{value}</span>
    </div>
  );
}

export function MLflowCard({ run }: MLflowCardProps) {
  const params = Object.entries(run.params_snapshot ?? {});
  const metrics = Object.entries(run.metrics_summary ?? {});
  const artifactCount = run.artifact_manifest?.length ?? 0;

  const canLinkOut = Boolean(run.mlflow_experiment_id && run.mlflow_run_id);
  const mlflowUrl = canLinkOut ? `${env.NEXT_PUBLIC_MLFLOW_BASE_URL}/#/experiments/${run.mlflow_experiment_id}/runs/${run.mlflow_run_id}` : null;

  return (
    <SectionCard title="MLflow">
      <div className="space-y-3">
        <FieldRow label="Experiment" value={run.mlflow_experiment_id ?? "—"} />
        <FieldRow label="Run" value={run.mlflow_run_id ?? "—"} />
        <FieldRow label="Artifacts" value={artifactCount} />

        {params.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Parameters</p>
            <div className="flex flex-wrap gap-1">
              {params.slice(0, 12).map(([key, value]) => (
                <Badge key={key} variant="outline" className="font-mono text-[10px]">
                  {key}={String(value)}
                </Badge>
              ))}
              {params.length > 12 && <Badge variant="secondary">+{params.length - 12} more</Badge>}
            </div>
          </div>
        )}

        {metrics.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Metrics</p>
            <div className="flex flex-wrap gap-1">
              {metrics.map(([key, value]) => (
                <Badge key={key} variant="secondary" className="font-mono text-[10px]">
                  {key}={typeof value === "number" ? value.toFixed(2) : String(value)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {mlflowUrl ? (
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href={mlflowUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              Open in MLflow
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2" disabled>
            <ExternalLink className="size-3.5" />
            Open in MLflow
          </Button>
        )}
      </div>
    </SectionCard>
  );
}
