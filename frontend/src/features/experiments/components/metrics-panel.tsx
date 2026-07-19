import { LineChart } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";

/**
 * Training-curve metrics (loss/val loss/accuracy/learning rate). The
 * backend only ever forwards epoch/step timing + infra telemetry over the
 * live socket (see resource_monitor.py::RunProgressTracker) - the training
 * script's own per-step loss value is logged to MLflow/TensorBoard, not
 * relayed here - so per "hide unavailable metrics rather than fake them,"
 * this panel never renders a chart it can't back with real data. See
 * ResourceUsagePanel for the metrics that genuinely stream live.
 */
export function MetricsPanel() {
  return (
    <EmptyState
      icon={LineChart}
      title="Training curves live in MLflow / TensorBoard"
      description="This backend doesn't relay per-step loss, validation loss, accuracy, or learning-rate history over the live socket - open the MLflow or TensorBoard card below for the full curves."
    />
  );
}
