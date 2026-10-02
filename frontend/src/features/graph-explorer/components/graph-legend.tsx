"use client";

import * as React from "react";
import { ChevronDown, Tags } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NODE_TYPE_CONFIG, nodeColorVar, type NodeTypeId } from "@/features/graph-explorer/lib/node-type-config";

interface GraphLegendProps {
  /** Node-type -> count present in the current (unfiltered) graph; only types that actually occur are listed. */
  counts: Partial<Record<NodeTypeId, number>>;
}

export function GraphLegend({ counts }: GraphLegendProps) {
  const [open, setOpen] = React.useState(true);
  const entries = (Object.keys(counts) as NodeTypeId[])
    .filter((type) => (counts[type] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));

  if (entries.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="glass-panel rounded-md p-2 text-card-foreground">
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-1 text-xs font-medium">
        <Tags className="size-3.5" />
        Legend
        <ChevronDown className={cn("ml-auto size-3.5 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1.5 max-h-64 space-y-1 overflow-y-auto px-1">
        {entries.map((type) => (
          <div key={type} className="flex items-center gap-2 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: nodeColorVar(type), boxShadow: `0 0 6px ${nodeColorVar(type)}` }}
            />
            <span className="flex-1 truncate">{NODE_TYPE_CONFIG[type].label}</span>
            <span className="text-muted-foreground">{counts[type]}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
