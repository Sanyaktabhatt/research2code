import * as React from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { cn } from "@/lib/utils/cn";
import type { FlowEdge } from "@/features/graph-explorer/types";

/** Shared React Flow edge renderer - a labeled bezier curve, dimmed when its endpoints fall outside the active selection/search. */
export const GraphEdge = React.memo(function GraphEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<FlowEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const dimmed = data?.dimmed ?? false;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={cn("transition-opacity duration-200", dimmed ? "opacity-10" : "opacity-70", selected && "animate-edge-flow")}
        style={{
          strokeWidth: selected ? 2.5 : 1.5,
          stroke: selected ? "hsl(var(--ring))" : "hsl(var(--flow-relation))",
          filter: selected ? "drop-shadow(0 0 4px hsl(var(--ring) / 0.6))" : undefined,
          strokeDasharray: selected ? "6 4" : undefined,
        }}
      />
      {data?.relType && !dimmed && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute rounded border border-border bg-popover px-1.5 py-0.5 text-[9px] font-medium text-popover-foreground shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
            }}
          >
            {data.relType}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
