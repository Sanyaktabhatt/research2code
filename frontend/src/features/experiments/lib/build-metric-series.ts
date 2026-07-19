import type { MetricsPoint } from "@/features/experiments/api/use-execution-stream";
import type { MetricChartPoint } from "@/features/experiments/components/metric-chart";

export interface MetricSeriesDef {
  id: string;
  title: string;
  colorVar: string;
  unit: string;
  select: (point: MetricsPoint) => number | null;
}

/**
 * Every series the backend can actually produce, given
 * execution/sandbox_executor.py's `on_progress` snapshot - CPU/memory/GPU
 * are real infra telemetry. There is deliberately no training-loss/
 * val-loss/accuracy/learning-rate series here: the backend never captures
 * or forwards those (see resource_monitor.py::RunProgressTracker.update,
 * which only reads epoch/step timing off the training script's PROGRESS
 * lines and drops any other key) - per "hide unavailable metrics rather
 * than fake them," they simply aren't defined as a selectable series.
 */
export const METRIC_SERIES_DEFS: MetricSeriesDef[] = [
  { id: "cpu", title: "CPU utilization", colorVar: "var(--chart-1)", unit: "%", select: (p) => p.cpuPercent },
  {
    id: "memory",
    title: "Memory usage",
    colorVar: "var(--chart-2)",
    unit: " MB",
    select: (p) => p.memoryMb,
  },
  {
    id: "gpu_util",
    title: "GPU utilization",
    colorVar: "var(--chart-3)",
    unit: "%",
    select: (p) => p.gpuUtilizationPercent,
  },
  { id: "gpu_memory", title: "GPU memory", colorVar: "var(--chart-4)", unit: " MB", select: (p) => p.gpuMemoryMb },
];

export interface BuiltSeries extends MetricSeriesDef {
  points: MetricChartPoint[];
}

/** Only series with at least one real (non-null) sample are returned - callers render exactly these, nothing else. */
export function buildMetricSeries(history: MetricsPoint[]): BuiltSeries[] {
  return METRIC_SERIES_DEFS.map((def) => ({
    ...def,
    points: history
      .map((point) => ({ x: point.elapsedSeconds, y: def.select(point) }))
      .filter((p): p is MetricChartPoint => p.y !== null),
  })).filter((series) => series.points.length > 0);
}
