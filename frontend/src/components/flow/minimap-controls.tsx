import { Controls, MiniMap } from "@xyflow/react";
import { nodeColorVar } from "@/features/graph-explorer/lib/node-type-config";
import type { FlowNode } from "@/features/graph-explorer/types";

function minimapNodeColor(node: FlowNode): string {
  return nodeColorVar(node.data.nodeType);
}

/** Shared minimap + pan/zoom/fit controls pairing for any React Flow canvas in the app. */
export function MinimapControls() {
  return (
    <>
      <MiniMap<FlowNode>
        pannable
        zoomable
        position="bottom-right"
        className="!rounded-md !border !border-border !bg-card !shadow-md"
        maskColor="hsl(var(--background) / 0.6)"
        nodeColor={minimapNodeColor}
      />
      <Controls
        position="bottom-left"
        className="!overflow-hidden !rounded-md !border !border-border !bg-card !shadow-md [&>button]:!border-border [&>button]:!bg-transparent [&>button]:!text-foreground [&>button:hover]:!bg-accent"
        showInteractive={false}
      />
    </>
  );
}
