import { MarkerType } from "@xyflow/react";
import type { GraphNode, GraphRelationship, GraphSnapshot } from "@/types/domain";
import { resolveNodeType } from "@/features/graph-explorer/lib/node-type-config";
import type { FlowEdge, FlowNode } from "@/features/graph-explorer/types";

/**
 * Every extraction entity type names itself differently (see
 * backend/app/services/knowledge_graph_builder.py) - `name`/`title` for most,
 * `metric_name` for a Result, `description` for a Limitation/FutureWork.
 * Falls back to the node's own key so nothing renders blank.
 */
function deriveNodeName(properties: Record<string, unknown>): string {
  const candidates = ["name", "title", "metric_name", "device_type", "description"];
  for (const field of candidates) {
    const value = properties[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return field === "description" && value.length > 60 ? `${value.slice(0, 57)}...` : value;
    }
  }
  return "Untitled";
}

function deriveConfidence(properties: Record<string, unknown>): number | null {
  const value = properties.confidence;
  return typeof value === "number" ? value : null;
}

export interface BuiltGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
  relationshipTypes: string[];
  adjacency: Map<string, Set<string>>;
}

/** Converts one paper's Neo4j snapshot into React Flow primitives - pure, no layout/positioning (see graph-layout.ts). */
export function buildFlowGraph(snapshot: GraphSnapshot): BuiltGraph {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();
  const relationshipTypeSet = new Set<string>();

  for (const rel of snapshot.relationships) {
    outgoing.set(rel.start_key, (outgoing.get(rel.start_key) ?? 0) + 1);
    incoming.set(rel.end_key, (incoming.get(rel.end_key) ?? 0) + 1);
    relationshipTypeSet.add(rel.type);

    if (!adjacency.has(rel.start_key)) adjacency.set(rel.start_key, new Set());
    if (!adjacency.has(rel.end_key)) adjacency.set(rel.end_key, new Set());
    adjacency.get(rel.start_key)!.add(rel.end_key);
    adjacency.get(rel.end_key)!.add(rel.start_key);
  }

  const nodes: FlowNode[] = snapshot.nodes.map((node: GraphNode) => ({
    id: node.key,
    type: "graphNode",
    position: { x: 0, y: 0 },
    data: {
      key: node.key,
      labels: node.labels,
      nodeType: resolveNodeType(node.labels),
      name: deriveNodeName(node.properties),
      confidence: deriveConfidence(node.properties),
      properties: node.properties,
      incoming: incoming.get(node.key) ?? 0,
      outgoing: outgoing.get(node.key) ?? 0,
      dimmed: false,
      matched: false,
    },
  }));

  const edges: FlowEdge[] = snapshot.relationships.map((rel: GraphRelationship, index: number) => ({
    id: `${rel.start_key}->${rel.type}->${rel.end_key}:${index}`,
    type: "graphEdge",
    source: rel.start_key,
    target: rel.end_key,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    data: { relType: rel.type, properties: rel.properties, dimmed: false },
  }));

  return { nodes, edges, relationshipTypes: [...relationshipTypeSet].sort(), adjacency };
}
