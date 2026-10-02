"use client";

import * as React from "react";
import { Archive, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { ArtifactSearch } from "@/features/artifacts-center/components/artifact-search";
import { ArtifactFilters } from "@/features/artifacts-center/components/artifact-filters";
import { ArtifactCard } from "@/features/artifacts-center/components/artifact-card";
import { ArtifactList } from "@/features/artifacts-center/components/artifact-list";
import { filterArtifacts, groupByCategory, groupByStage, sortArtifacts } from "@/features/artifacts-center/lib/filter-sort-artifacts";
import {
  DEFAULT_ARTIFACT_FILTERS,
  type ArtifactCategory,
  type ArtifactGroupKey,
  type ArtifactSortKey,
  type ArtifactViewMode,
  type UnifiedArtifact,
} from "@/features/artifacts-center/types";

interface ArtifactBrowserProps {
  artifacts: UnifiedArtifact[];
  selectedId: string | null;
  onSelect: (artifact: UnifiedArtifact) => void;
}

const SORT_OPTIONS: { value: ArtifactSortKey; label: string }[] = [
  { value: "created", label: "Created" },
  { value: "name", label: "Name" },
  { value: "size", label: "Size" },
  { value: "version", label: "Version" },
];

/** Search/filter/sort/group toolbar plus a list-or-grid render of the results - the reusable shell every artifact view is built from. */
export function ArtifactBrowser({ artifacts, selectedId, onSelect }: ArtifactBrowserProps) {
  const [filters, setFilters] = React.useState(DEFAULT_ARTIFACT_FILTERS);
  const [sortKey, setSortKey] = React.useState<ArtifactSortKey>("created");
  const [groupKey, setGroupKey] = React.useState<ArtifactGroupKey>("category");
  const [viewMode, setViewMode] = React.useState<ArtifactViewMode>("grid");

  const availableCategories = React.useMemo(
    () => Array.from(new Set(artifacts.map((a) => a.category))) as ArtifactCategory[],
    [artifacts],
  );

  const filtered = React.useMemo(() => filterArtifacts(artifacts, filters), [artifacts, filters]);
  const sorted = React.useMemo(() => sortArtifacts(filtered, sortKey, "desc"), [filtered, sortKey]);

  const groups = React.useMemo(() => {
    if (groupKey === "category") return groupByCategory(sorted);
    if (groupKey === "stage") return groupByStage(sorted);
    return new Map([["All artifacts", sorted]]);
  }, [sorted, groupKey]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <ArtifactSearch value={filters.search} onChange={(search) => setFilters((f) => ({ ...f, search }))} />
        <ArtifactFilters filters={filters} onChange={setFilters} availableCategories={availableCategories} />
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as ArtifactSortKey)}>
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
        <Select value={groupKey} onValueChange={(v) => setGroupKey(v as ArtifactGroupKey)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="category">Group by category</SelectItem>
            <SelectItem value="stage">Group by stage</SelectItem>
            <SelectItem value="none">No grouping</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1">
          <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("grid")} aria-label="Grid view">
            <LayoutGrid className="size-4" />
          </Button>
          <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("list")} aria-label="List view">
            <List className="size-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        {sorted.length === 0 ? (
          <EmptyState icon={Archive} title="No artifacts match" description="Try loosening your search or filters." />
        ) : (
          Array.from(groups.entries()).map(([label, groupArtifacts]) => (
            <div key={label}>
              {groupKey !== "none" && (
                <p className="mb-2 section-label">
                  {label} ({groupArtifacts.length})
                </p>
              )}
              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-2">
                  {groupArtifacts.map((artifact) => (
                    <ArtifactCard key={artifact.id} artifact={artifact} isSelected={artifact.id === selectedId} onSelect={() => onSelect(artifact)} />
                  ))}
                </div>
              ) : (
                <ArtifactList artifacts={groupArtifacts} selectedId={selectedId} onSelect={onSelect} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
