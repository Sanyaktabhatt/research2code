"use client";

import * as React from "react";
import { FlaskConical, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { RunCard } from "@/features/experiments/components/run-card";
import { RunFilters } from "@/features/experiments/components/run-filters";
import { filterRuns, sortRuns } from "@/features/experiments/lib/filter-sort-runs";
import { DEFAULT_RUN_FILTERS, type EnrichedRun, type RunSortKey } from "@/features/experiments/types";

interface RunListProps {
  runs: EnrichedRun[];
  selectedRunId: string | null;
  compareIds: string[];
  onSelectRun: (run: EnrichedRun) => void;
  onToggleCompare: (runId: string, checked: boolean) => void;
}

const SORT_OPTIONS: { value: RunSortKey; label: string }[] = [
  { value: "started_at", label: "Started" },
  { value: "duration", label: "Duration" },
  { value: "status", label: "Status" },
  { value: "version", label: "Version" },
];

/** All execution runs for the project - search/filter/sort toolbar over a list of RunCard, plus multi-select checkboxes feeding Run Comparison. */
export function RunList({ runs, selectedRunId, compareIds, onSelectRun, onToggleCompare }: RunListProps) {
  const [filters, setFilters] = React.useState(DEFAULT_RUN_FILTERS);
  const [sortKey, setSortKey] = React.useState<RunSortKey>("started_at");

  const filtered = React.useMemo(() => filterRuns(runs, filters), [runs, filters]);
  const sorted = React.useMemo(() => sortRuns(filtered, sortKey, "desc"), [filtered, sortKey]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search runs…"
            className="pl-8 pr-8"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 size-7 -translate-y-1/2"
              onClick={() => setFilters((f) => ({ ...f, search: "" }))}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        <RunFilters filters={filters} onChange={setFilters} />
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as RunSortKey)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {sorted.length === 0 ? (
          <EmptyState icon={FlaskConical} title="No runs match" description="Try loosening your search or filters." />
        ) : (
          sorted.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              isSelected={run.id === selectedRunId}
              isComparing={compareIds.includes(run.id)}
              onSelect={() => onSelectRun(run)}
              onToggleCompare={(checked) => onToggleCompare(run.id, checked)}
            />
          ))
        )}
      </div>
    </div>
  );
}
