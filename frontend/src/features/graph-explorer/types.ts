import type { Edge, Node } from "@xyflow/react";
import type { NodeTypeId } from "@/features/graph-explorer/lib/node-type-config";

/** Source-project identity, set only by the cross-project explorer. */
export interface GraphProjectRef {
  id: string;
  name: string;
  /** CSS color for the project's indicator dot. */
  color: string;
}

export interface FlowNodeData extends Record<string, unknown> {
  key: string;
  labels: string[];
  nodeType: NodeTypeId | null;
  name: string;
  confidence: number | null;
  properties: Record<string, unknown>;
  incoming: number;
  outgoing: number;
  dimmed: boolean;
  matched: boolean;
  project?: GraphProjectRef;
}

export interface FlowEdgeData extends Record<string, unknown> {
  relType: string;
  properties: Record<string, unknown>;
  dimmed: boolean;
  project?: GraphProjectRef;
}

export type FlowNode = Node<FlowNodeData, "graphNode">;
export type FlowEdge = Edge<FlowEdgeData, "graphEdge">;

export interface GraphFilterState {
  search: string;
  nodeTypes: NodeTypeId[];
  relationshipTypes: string[];
  confidenceMin: number;
  confidenceMax: number;
}

export const DEFAULT_GRAPH_FILTERS: GraphFilterState = {
  search: "",
  nodeTypes: [],
  relationshipTypes: [],
  confidenceMin: 0,
  confidenceMax: 1,
};
