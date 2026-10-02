import * as React from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  type NodeMouseHandler,
  type OnEdgesChange,
  type OnNodesChange,
  type OnSelectionChangeFunc,
  type ReactFlowInstance,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GraphNode } from "@/components/flow/graph-node";
import { GraphEdge } from "@/components/flow/graph-edge";
import { MinimapControls } from "@/components/flow/minimap-controls";
import type { FlowEdge, FlowNode } from "@/features/graph-explorer/types";

const nodeTypes = { graphNode: GraphNode };
const edgeTypes = { graphEdge: GraphEdge };

interface GraphCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: OnNodesChange<FlowNode>;
  onEdgesChange: OnEdgesChange<FlowEdge>;
  onNodeClick?: NodeMouseHandler<FlowNode>;
  onNodeDoubleClick?: NodeMouseHandler<FlowNode>;
  onPaneClick?: () => void;
  onSelectionChange?: OnSelectionChangeFunc<FlowNode, FlowEdge>;
  onInit?: (instance: ReactFlowInstance<FlowNode, FlowEdge>) => void;
  defaultViewport?: Viewport;
  /** Skip rendering off-screen nodes/edges - worth enabling for large graphs. */
  onlyRenderVisibleElements?: boolean;
  children?: React.ReactNode;
}

/**
 * Shared React Flow canvas: pan/zoom/fit/minimap/controls/background grid,
 * node dragging, node & edge selection. Generic over `FlowNode`/`FlowEdge` so
 * other graph-shaped views (e.g. an orchestrator agent flow) can reuse it by
 * supplying their own node/edge `data` shape through the same `graphNode`/
 * `graphEdge` renderers, or their own renderers via a future `nodeTypes` prop.
 */
export function GraphCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
  onSelectionChange,
  onInit,
  defaultViewport,
  onlyRenderVisibleElements = false,
  children,
}: GraphCanvasProps) {
  return (
    <div className="relative h-full w-full bg-muted/30">
      <ReactFlow<FlowNode, FlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        onInit={onInit}
        defaultViewport={defaultViewport}
        onlyRenderVisibleElements={onlyRenderVisibleElements}
        minZoom={0.05}
        maxZoom={2.5}
        panOnScroll
        selectionOnDrag
        elevateNodesOnSelect
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-50" />
        <MinimapControls />
        {children}
      </ReactFlow>
    </div>
  );
}
