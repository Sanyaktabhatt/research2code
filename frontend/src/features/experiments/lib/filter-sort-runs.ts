import type { EnrichedRun, RunFilterState, RunSortKey, SortDirection } from "@/features/experiments/types";

export function filterRuns(runs: EnrichedRun[], filters: RunFilterState): EnrichedRun[] {
  const needle = filters.search.trim().toLowerCase();

  return runs.filter((run) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(run.status)) return false;
    if (filters.devices.length > 0 && !filters.devices.includes(run.device)) return false;
    if (needle.length === 0) return true;

    const haystack = [`v${run.version}`, run.status, run.device, run.framework, run.execution_backend].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

export function sortRuns(runs: EnrichedRun[], key: RunSortKey, direction: SortDirection): EnrichedRun[] {
  const sorted = [...runs].sort((a, b) => {
    switch (key) {
      case "started_at":
        return (a.started_at ? new Date(a.started_at).getTime() : 0) - (b.started_at ? new Date(b.started_at).getTime() : 0);
      case "duration":
        return (a.durationSeconds ?? -1) - (b.durationSeconds ?? -1);
      case "status":
        return a.status.localeCompare(b.status);
      case "version":
        return a.version - b.version;
    }
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}
