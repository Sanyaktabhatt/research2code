"use client";

import { useResourceStream } from "@/lib/ws/use-resource-stream";
import type { ExecutionRunStatus, ExecutionWsFrame } from "@/types/domain";

export interface MetricsPoint {
  receivedAt: number;
  epoch: number | null;
  totalEpochs: number | null;
  step: number | null;
  totalSteps: number | null;
  elapsedSeconds: number;
  etaSeconds: number | null;
  cpuPercent: number | null;
  memoryMb: number | null;
  memoryLimitMb: number | null;
  gpuUtilizationPercent: number | null;
  gpuMemoryMb: number | null;
  diskUsagePercent: number | null;
}

interface ExecutionStreamState {
  status: ExecutionRunStatus | null;
  errorMessage: string | null;
  logLines: string[];
  metricsHistory: MetricsPoint[];
}

const MAX_LOG_LINES = 5000;
const MAX_METRIC_POINTS = 1000;

const INITIAL_STATE: ExecutionStreamState = { status: null, errorMessage: null, logLines: [], metricsHistory: [] };

function reduce(state: ExecutionStreamState, frame: ExecutionWsFrame): ExecutionStreamState {
  switch (frame.type) {
    case "status":
      return { ...state, status: frame.status, errorMessage: frame.error ?? state.errorMessage };
    case "log": {
      const logLines = [...state.logLines, frame.line];
      if (logLines.length > MAX_LOG_LINES) logLines.splice(0, logLines.length - MAX_LOG_LINES);
      return { ...state, logLines };
    }
    case "metrics": {
      const point: MetricsPoint = {
        receivedAt: Date.now(),
        epoch: frame.epoch,
        totalEpochs: frame.total_epochs,
        step: frame.step,
        totalSteps: frame.total_steps,
        elapsedSeconds: frame.elapsed_seconds,
        etaSeconds: frame.eta_seconds,
        cpuPercent: frame.cpu_percent,
        memoryMb: frame.memory_mb,
        memoryLimitMb: frame.memory_limit_mb,
        gpuUtilizationPercent: frame.gpu_utilization_percent,
        gpuMemoryMb: frame.gpu_memory_mb,
        diskUsagePercent: frame.disk_usage_percent,
      };
      const metricsHistory = [...state.metricsHistory, point];
      if (metricsHistory.length > MAX_METRIC_POINTS) metricsHistory.splice(0, metricsHistory.length - MAX_METRIC_POINTS);
      return { ...state, metricsHistory };
    }
    default:
      return state;
  }
}

/**
 * Live status/logs/resource-metrics for one execution run, over the shared
 * `/execution-runs/{id}/progress` WebSocket (reconnects automatically - see
 * lib/ws/client.ts). The backend never persists a metrics time series (only
 * a final `metrics_summary` snapshot - see execution/sandbox_executor.py),
 * so `metricsHistory` only has data for a run watched live in this session;
 * it's intentionally empty for a completed run reopened later.
 */
export function useExecutionStream(runId: string | undefined, enabled: boolean) {
  const { state, status, reset } = useResourceStream<ExecutionWsFrame, ExecutionStreamState>(runId, {
    path: (id) => `/execution-runs/${id}/progress`,
    reduce,
    initialState: INITIAL_STATE,
    enabled,
  });

  return { ...state, wsStatus: status, reset };
}
