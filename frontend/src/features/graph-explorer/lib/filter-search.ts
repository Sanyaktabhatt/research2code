import type { GraphFilterState } from "@/features/graph-explorer/types";
import type { FlowEdge, FlowNode } from "@/features/graph-explorer/types";

/** Node-type/relationship-type/confidence filters remove nodes & edges from the graph entirely (unlike search, which only highlights). */
export function filterGraph(
  nodes: FlowNode[],
  edges: FlowEdge[],
  filters: GraphFilterState,
  forcedVisible: Set<string> = new Set(),
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const typeFilterActive = filters.nodeTypes.length > 0;
  const confidenceFilterActive = filters.confidenceMin > 0 || filters.confidenceMax < 1;

  const visibleNodes = nodes.filter((node) => {
    if (forcedVisible.has(node.id)) return true;
    if (typeFilterActive && (!node.data.nodeType || !filters.nodeTypes.includes(node.data.nodeType))) return false;
    if (confidenceFilterActive && node.data.confidence !== null) {
      if (node.data.confidence < filters.confidenceMin || node.data.confidence > filters.confidenceMax) return false;
    }
    return true;
  });
  const visibleIds = new Set(visibleNodes.map((n) => n.id));

  const relFilterActive = filters.relationshipTypes.length > 0;
  const visibleEdges = edges.filter((edge) => {
    if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) return false;
    if (relFilterActive && !filters.relationshipTypes.includes(edge.data!.relType)) return false;
    return true;
  });

  return { nodes: visibleNodes, edges: visibleEdges };
}

function nodeSearchText(node: FlowNode): string {
  const parts = [node.data.name, ...node.data.labels, JSON.stringify(node.data.properties)];
  return parts.join(" ").toLowerCase();
}

export function searchMatches(nodes: FlowNode[], query: string): Set<string> {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return new Set();
  return new Set(nodes.filter((node) => nodeSearchText(node).includes(needle)).map((n) => n.id));
}

/** Nodes reachable from `selectedId` in one hop (via `adjacency`), plus the node itself. */
export function neighborsOf(selectedId: string, adjacency: Map<string, Set<string>>): Set<string> {
  const result = new Set<string>([selectedId]);
  for (const neighbor of adjacency.get(selectedId) ?? []) result.add(neighbor);
  return result;
}

/** Node ids with no edges once type/relationship/confidence filters are applied. */
export function isolatedNodeIds(nodes: FlowNode[], edges: FlowEdge[]): Set<string> {
  const connected = new Set<string>();
  for (const edge of edges) {
    connected.add(edge.source);
    connected.add(edge.target);
  }
  return new Set(nodes.filter((n) => !connected.has(n.id)).map((n) => n.id));
}
