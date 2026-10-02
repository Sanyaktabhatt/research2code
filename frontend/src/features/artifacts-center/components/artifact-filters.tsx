"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATEGORY_CONFIG } from "@/features/artifacts-center/lib/category-config";
import { PIPELINE_STAGES } from "@/features/artifacts-center/types";
import { DEFAULT_ARTIFACT_FILTERS, type ArtifactCategory, type ArtifactFilterState } from "@/features/artifacts-center/types";

interface ArtifactFiltersProps {
  filters: ArtifactFilterState;
  onChange: (filters: ArtifactFilterState) => void;
  availableCategories: ArtifactCategory[];
}

export function ArtifactFilters({ filters, onChange, availableCategories }: ArtifactFiltersProps) {
  const activeCount =
    filters.categories.length +
    filters.stages.length +
    (filters.minSizeBytes !== null ? 1 : 0) +
    (filters.maxSizeBytes !== null ? 1 : 0) +
    (filters.afterDate ? 1 : 0);

  const toggleCategory = (category: ArtifactCategory) => {
    const next = filters.categories.includes(category) ? filters.categories.filter((c) => c !== category) : [...filters.categories, category];
    onChange({ ...filters, categories: next });
  };

  const toggleStage = (stage: (typeof PIPELINE_STAGES)[number]) => {
    const next = filters.stages.includes(stage) ? filters.stages.filter((s) => s !== stage) : [...filters.stages, stage];
    onChange({ ...filters, stages: next });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="size-4" />
          Filters
          {activeCount > 0 && <span className="rounded-sm bg-info px-1.5 text-[11px] font-semibold text-info-foreground">{activeCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-4">
        <div>
          <Label className="mb-2 block">Category</Label>
          <div className="max-h-40 space-y-1.5 overflow-y-auto">
            {availableCategories.map((category) => (
              <label key={category} className="flex items-center gap-2 text-sm">
                <Checkbox checked={filters.categories.includes(category)} onCheckedChange={() => toggleCategory(category)} />
                {CATEGORY_CONFIG[category].label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Pipeline stage</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {PIPELINE_STAGES.map((stage) => (
              <label key={stage} className="flex items-center gap-2 text-xs">
                <Checkbox checked={filters.stages.includes(stage)} onCheckedChange={() => toggleStage(stage)} />
                {stage}
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Created after</Label>
          <Input
            type="date"
            value={filters.afterDate ?? ""}
            onChange={(e) => onChange({ ...filters, afterDate: e.target.value || null })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-2 block">Min size (KB)</Label>
            <Input
              type="number"
              min={0}
              value={filters.minSizeBytes !== null ? Math.round(filters.minSizeBytes / 1024) : ""}
              onChange={(e) => onChange({ ...filters, minSizeBytes: e.target.value ? Number(e.target.value) * 1024 : null })}
            />
          </div>
          <div>
            <Label className="mb-2 block">Max size (KB)</Label>
            <Input
              type="number"
              min={0}
              value={filters.maxSizeBytes !== null ? Math.round(filters.maxSizeBytes / 1024) : ""}
              onChange={(e) => onChange({ ...filters, maxSizeBytes: e.target.value ? Number(e.target.value) * 1024 : null })}
            />
          </div>
        </div>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange({ ...DEFAULT_ARTIFACT_FILTERS, search: filters.search })}>
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
