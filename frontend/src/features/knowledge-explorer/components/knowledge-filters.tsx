"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { CATEGORY_CONFIG, CATEGORY_IDS, TYPE_GROUP_LABELS, type CategoryId, type EntityTypeGroup } from "@/features/knowledge-explorer/types";
import type { KnowledgeFiltersState } from "@/features/knowledge-explorer/lib/filter-sort";

const TYPE_GROUPS: EntityTypeGroup[] = ["documentation", "data", "architecture", "training", "evaluation", "infrastructure"];

interface KnowledgeFiltersProps {
  filters: KnowledgeFiltersState;
  onChange: (filters: KnowledgeFiltersState) => void;
}

export function KnowledgeFilters({ filters, onChange }: KnowledgeFiltersProps) {
  const activeCount =
    filters.categories.length +
    filters.typeGroups.length +
    (filters.confidenceMin > 0 || filters.confidenceMax < 1 ? 1 : 0);

  const toggleCategory = (category: CategoryId) => {
    const next = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    onChange({ ...filters, categories: next });
  };

  const toggleTypeGroup = (typeGroup: EntityTypeGroup) => {
    const next = filters.typeGroups.includes(typeGroup)
      ? filters.typeGroups.filter((t) => t !== typeGroup)
      : [...filters.typeGroups, typeGroup];
    onChange({ ...filters, typeGroups: next });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="size-4" />
          Filters
          {activeCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{activeCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Confidence</Label>
            <span className="text-xs text-muted-foreground">
              {Math.round(filters.confidenceMin * 100)}% - {Math.round(filters.confidenceMax * 100)}%
            </span>
          </div>
          <Slider
            value={[filters.confidenceMin * 100, filters.confidenceMax * 100]}
            min={0}
            max={100}
            step={5}
            onValueChange={([min, max]) => onChange({ ...filters, confidenceMin: (min ?? 0) / 100, confidenceMax: (max ?? 100) / 100 })}
          />
        </div>

        <div>
          <Label className="mb-2 block">Entity type</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {TYPE_GROUPS.map((typeGroup) => (
              <label key={typeGroup} className="flex items-center gap-2 text-sm">
                <Checkbox checked={filters.typeGroups.includes(typeGroup)} onCheckedChange={() => toggleTypeGroup(typeGroup)} />
                {TYPE_GROUP_LABELS[typeGroup]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Category</Label>
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {CATEGORY_IDS.map((category) => (
              <label key={category} className="flex items-center gap-2 text-sm">
                <Checkbox checked={filters.categories.includes(category)} onCheckedChange={() => toggleCategory(category)} />
                {CATEGORY_CONFIG[category].label}
              </label>
            ))}
          </div>
        </div>

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onChange({ search: filters.search, confidenceMin: 0, confidenceMax: 1, categories: [], typeGroups: [] })}
          >
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
