import * as React from "react";
import { Gauge } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { MetricChart } from "@/features/experiments/components/metric-chart";
import { buildMetricSeries } from "@/features/experiments/lib/build-metric-series";
import type { MetricsPoint } from "@/features/experiments/api/use-execution-stream";

interface ResourceUsagePanelProps {
  metricsHistory: MetricsPoint[];
}

/** CPU/memory/GPU usage over the run's lifetime - the only metrics the backend actually streams (see build-metric-series.ts). Each chart only appears once real samples exist for it. */
export function ResourceUsagePanel({ metricsHistory }: ResourceUsagePanelProps) {
  const series = React.useMemo(() => buildMetricSeries(metricsHistory), [metricsHistory]);

  if (series.length === 0) {
    return (
      <EmptyState
        icon={Gauge}
        title="No resource metrics yet"
        description="Metrics only exist for the time a run was watched live - reopen this run while it's running to see CPU/GPU/memory charts."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {series.map((s) => (
        <MetricChart key={s.id} title={s.title} data={s.points} colorVar={s.colorVar} unit={s.unit} />
      ))}
    </div>
  );
}
