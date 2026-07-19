"use client";

import * as React from "react";
import { FileWarning, FlaskConical, UploadCloud, WifiOff } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceInspectorStore } from "@/stores/workspace-inspector-store";
import { ACTIVE_EXECUTION_RUN_STATUSES } from "@/lib/utils/status-mapping";
import { useExperimentRuns } from "@/features/experiments/api/use-experiment-runs";
import { useRunDetail } from "@/features/experiments/api/use-run-detail";
import { useExecutionStream } from "@/features/experiments/api/use-execution-stream";
import { useLogText } from "@/features/experiments/api/use-log-text";
import { RunList } from "@/features/experiments/components/run-list";
import { RunDetails } from "@/features/experiments/components/run-details";
import { LogViewer } from "@/features/experiments/components/log-viewer";
import { MetricsPanel } from "@/features/experiments/components/metrics-panel";
import { ResourceUsagePanel } from "@/features/experiments/components/resource-usage-panel";
import { TensorBoardCard } from "@/features/experiments/components/tensorboard-card";
import { MLflowCard } from "@/features/experiments/components/mlflow-card";
import { ArtifactPanel } from "@/features/experiments/components/artifact-panel";
import { RunComparison } from "@/features/experiments/components/run-comparison";
import type { EnrichedRun } from "@/features/experiments/types";

interface ExperimentDashboardProps {
  projectId: string;
}

/** Feature root for the Experiment Dashboard: all execution runs across every generated-project version, live status/logs/metrics for the selected run, and multi-run comparison. */
export function ExperimentDashboard({ projectId }: ExperimentDashboardProps) {
  const setInspectorSelection = useWorkspaceInspectorStore((s) => s.setSelection);
  const data = useExperimentRuns(projectId);

  const [selectedRun, setSelectedRun] = React.useState<EnrichedRun | null>(null);
  const [compareIds, setCompareIds] = React.useState<string[]>([]);
  const [activeTab, setActiveTab] = React.useState("details");

  React.useEffect(() => {
    if (!selectedRun && data.runs.length > 0) setSelectedRun(data.runs[0]!);
  }, [selectedRun, data.runs]);

  const selectedEnriched = selectedRun ? (data.runs.find((r) => r.id === selectedRun.id) ?? selectedRun) : null;

  const runDetail = useRunDetail(selectedEnriched?.generated_project_id ?? null, selectedEnriched?.version ?? null);

  const stream = useExecutionStream(
    selectedEnriched?.id,
    Boolean(selectedEnriched) && ACTIVE_EXECUTION_RUN_STATUSES.includes(selectedEnriched?.status ?? "completed"),
  );
  const isLive = Boolean(selectedEnriched) && ACTIVE_EXECUTION_RUN_STATUSES.includes(stream.status ?? selectedEnriched!.status);

  const historicalLogs = useLogText(!isLive ? runDetail.logDownloadUrl : null);
  const logLines = isLive ? stream.logLines : historicalLogs.lines;
  const latestMetrics = stream.metricsHistory[stream.metricsHistory.length - 1] ?? null;

  const handleSelectRun = (run: EnrichedRun) => {
    setSelectedRun(run);
    setActiveTab("details");
  };

  // `container_id`/`metrics_summary` only exist on the detail fetch (see
  // ExecutionRunDetail vs the base ExecutionRun the run list is built
  // from), so the inspector is populated once that resolves rather than
  // at selection time.
  React.useEffect(() => {
    if (!selectedEnriched) return;
    setInspectorSelection({
      tab: "experiments",
      runId: selectedEnriched.id,
      version: selectedEnriched.version,
      status: selectedEnriched.status,
      hardware: `${selectedEnriched.device.toUpperCase()} · ${selectedEnriched.execution_backend}`,
      dockerImage: runDetail.run?.container_id ?? null,
      generatedProjectVersion: selectedEnriched.generatedProjectVersion,
      knowledgeExtractionVersion: selectedEnriched.knowledgeExtractionVersion,
      resourceSummary: runDetail.run?.metrics_summary ?? {},
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEnriched, runDetail.run]);

  const handleToggleCompare = (runId: string, checked: boolean) => {
    setCompareIds((prev) => (checked ? [...prev, runId] : prev.filter((id) => id !== runId)));
  };

  if (data.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton className="sm:col-span-2" />
      </div>
    );
  }

  if (data.isError) {
    return <EmptyState icon={FileWarning} title="Couldn't load experiment runs" description="Something went wrong fetching this project's execution runs." />;
  }

  if (!data.hasPaper) {
    return <EmptyState icon={UploadCloud} title="No paper uploaded yet" description="Upload a paper and generate a project before running experiments." />;
  }

  if (!data.hasGeneratedProject || data.runs.length === 0) {
    return <EmptyState icon={FlaskConical} title="No experiment runs yet" description="Generate a project, then trigger an execution run from the Overview tab's quick actions." />;
  }

  const compareRuns = data.runs.filter((r) => compareIds.includes(r.id));

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[560px] flex-col gap-3 lg:flex-row">
      <aside className="max-h-64 w-full shrink-0 overflow-hidden rounded-xl border border-border bg-muted/20 p-2 lg:h-full lg:max-h-none lg:w-72">
        <RunList
          runs={data.runs}
          selectedRunId={selectedEnriched?.id ?? null}
          compareIds={compareIds}
          onSelectRun={handleSelectRun}
          onToggleCompare={handleToggleCompare}
        />
      </aside>

      <div className="min-h-0 min-w-0 flex-1 rounded-xl border border-border bg-card p-4 shadow-xs">
        {!selectedEnriched ? (
          <EmptyState icon={FlaskConical} title="Select a run" description="Choose an execution run from the list to see its details." />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0 overflow-x-auto">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
                  <TabsTrigger value="integrations">Integrations</TabsTrigger>
                  {compareRuns.length >= 2 && <TabsTrigger value="compare">Compare ({compareRuns.length})</TabsTrigger>}
                </TabsList>
              </div>
              {isLive && stream.wsStatus !== "open" && (
                <Badge variant="secondary" className="gap-1">
                  <WifiOff className="size-3" />
                  {stream.wsStatus === "connecting" ? "Connecting…" : "Reconnecting…"}
                </Badge>
              )}
            </div>

            <TabsContent value="details" className="min-h-0 flex-1 overflow-y-auto">
              <RunDetails run={selectedEnriched} liveStatus={stream.status} latestMetrics={latestMetrics} />
            </TabsContent>

            <TabsContent value="logs" className="min-h-0 flex-1">
              <LogViewer lines={logLines} isLive={isLive} downloadUrl={runDetail.logDownloadUrl} />
            </TabsContent>

            <TabsContent value="metrics" className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              <ResourceUsagePanel metricsHistory={stream.metricsHistory} />
              <MetricsPanel />
            </TabsContent>

            <TabsContent value="artifacts" className="min-h-0 flex-1 overflow-y-auto">
              {runDetail.run && <ArtifactPanel run={runDetail.run} logDownloadUrl={runDetail.logDownloadUrl} />}
            </TabsContent>

            <TabsContent value="integrations" className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              {runDetail.run && (
                <>
                  <TensorBoardCard logDir={runDetail.run.tensorboard_log_dir} url={runDetail.tensorboardUrl} isLoading={runDetail.isTensorboardLoading} />
                  <MLflowCard run={runDetail.run} />
                </>
              )}
            </TabsContent>

            {compareRuns.length >= 2 && (
              <TabsContent value="compare" className="min-h-0 flex-1 overflow-y-auto">
                <RunComparison runs={compareRuns} onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}
