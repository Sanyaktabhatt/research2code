import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils/cn";
import { getNodeTypeStyle, nodeColorVar } from "@/features/graph-explorer/lib/node-type-config";
import type { FlowNode } from "@/features/graph-explorer/types";

/**
 * Shared React Flow node renderer for the knowledge graph - registered as
 * `nodeTypes.graphNode` on GraphCanvas. Kept generic (reads color/icon off
 * `data.nodeType`) so any future graph view can reuse it without pulling in
 * graph-explorer's search/filter/selection logic.
 */
export const GraphNode = React.memo(function GraphNode({ data, selected }: NodeProps<FlowNode>) {
  const style = getNodeTypeStyle(data.nodeType);
  const Icon = style.icon;
  const color = nodeColorVar(data.nodeType);

  return (
    <div
      className={cn(
        "flex min-w-36 max-w-56 items-center gap-2 rounded-md border-2 bg-card px-3 py-2 text-card-foreground shadow-xs transition-[opacity,box-shadow] duration-150 hover:shadow-md",
        selected && "ring-2 ring-offset-2 ring-offset-background",
        data.matched && "ring-2 ring-warning ring-offset-2 ring-offset-background",
        data.dimmed ? "opacity-20" : "opacity-100",
      )}
      style={{
        borderColor: color,
        boxShadow: selected
          ? `0 0 0 1px ${color}, 0 0 24px -2px ${color}`
          : `0 1px 2px hsl(var(--shadow-color) / 0.06), 0 0 16px -8px ${color}`,
        ...(selected ? { ["--tw-ring-color" as string]: color } : {}),
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <div
        className="flex size-7 shrink-0 items-center justify-center rounded-md shadow-sm"
        style={{ backgroundColor: color, color: "white" }}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium" title={data.name}>
          {data.name}
        </p>
        <p className="truncate text-[10px] text-muted-foreground">{style.label}</p>
        {data.project && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground" title={data.project.name}>
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: data.project.color }} aria-hidden="true" />
            <span className="truncate">{data.project.name}</span>
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  );
});
