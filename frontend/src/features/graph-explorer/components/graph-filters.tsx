"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { NODE_TYPE_CONFIG, type NodeTypeId } from "@/features/graph-explorer/lib/node-type-config";
import { DEFAULT_GRAPH_FILTERS, type GraphFilterState } from "@/features/graph-explorer/types";

interface GraphFiltersProps {
  filters: GraphFilterState;
  onChange: (filters: GraphFilterState) => void;
  availableNodeTypes: NodeTypeId[];
  availableRelationshipTypes: string[];
}

export function GraphFilters({ filters, onChange, availableNodeTypes, availableRelationshipTypes }: GraphFiltersProps) {
  const activeCount =
    filters.nodeTypes.length +
    filters.relationshipTypes.length +
    (filters.confidenceMin > 0 || filters.confidenceMax < 1 ? 1 : 0);

  const toggleNodeType = (nodeType: NodeTypeId) => {
    const next = filters.nodeTypes.includes(nodeType)
      ? filters.nodeTypes.filter((t) => t !== nodeType)
      : [...filters.nodeTypes, nodeType];
    onChange({ ...filters, nodeTypes: next });
  };

  const toggleRelationshipType = (relType: string) => {
    const next = filters.relationshipTypes.includes(relType)
      ? filters.relationshipTypes.filter((t) => t !== relType)
      : [...filters.relationshipTypes, relType];
    onChange({ ...filters, relationshipTypes: next });
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
          <Label className="mb-2 block">Node type</Label>
          <div className="max-h-40 space-y-1.5 overflow-y-auto">
            {availableNodeTypes.map((nodeType) => (
              <label key={nodeType} className="flex items-center gap-2 text-sm">
                <Checkbox checked={filters.nodeTypes.includes(nodeType)} onCheckedChange={() => toggleNodeType(nodeType)} />
                {NODE_TYPE_CONFIG[nodeType].label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Relationship type</Label>
          <div className="max-h-40 space-y-1.5 overflow-y-auto">
            {availableRelationshipTypes.map((relType) => (
              <label key={relType} className="flex items-center gap-2 text-sm">
                <Checkbox checked={filters.relationshipTypes.includes(relType)} onCheckedChange={() => toggleRelationshipType(relType)} />
                {relType}
              </label>
            ))}
          </div>
        </div>

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onChange({ ...DEFAULT_GRAPH_FILTERS, search: filters.search })}
          >
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
