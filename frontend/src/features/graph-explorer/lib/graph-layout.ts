import dagre from "dagre";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import type { GraphLayoutMode } from "@/stores/graph-view-store";
import type { FlowEdge, FlowNode } from "@/features/graph-explorer/types";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;

function forceLayout(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  interface SimNode extends FlowNode {
    x: number;
    y: number;
  }
  const simNodes: SimNode[] = nodes.map((node) => ({ ...node, x: node.position.x, y: node.position.y }));
  const simLinks = edges.map((edge) => ({ source: edge.source, target: edge.target }));

  const simulation = forceSimulation(simNodes)
    .force(
      "link",
      forceLink(simLinks)
        .id((d) => (d as SimNode).id)
        .distance(160)
        .strength(0.4),
    )
    .force("charge", forceManyBody().strength(-450))
    .force("center", forceCenter(0, 0))
    .force("collide", forceCollide(NODE_WIDTH / 1.6))
    .stop();

  simulation.tick(300);

  return simNodes.map((node) => ({ ...node, position: { x: node.x, y: node.y } }));
}

function hierarchicalLayout(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 110 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const positioned = graph.node(node.id);
    return positioned
      ? { ...node, position: { x: positioned.x - NODE_WIDTH / 2, y: positioned.y - NODE_HEIGHT / 2 } }
      : node;
  });
}

/**
 * BFS depth from the Paper node(s) - the versioning anchor every other
 * entity ultimately connects back to (see knowledge_graph_builder.py) -
 * placed on concentric rings, one node's angle-slice per ring.
 */
function radialLayout(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }

  const roots = nodes.filter((n) => n.data.nodeType === "Paper").map((n) => n.id);
  const startIds = roots.length > 0 ? roots : nodes.length > 0 ? [nodes[0]!.id] : [];

  const depth = new Map<string, number>();
  const queue: string[] = [];
  for (const id of startIds) {
    depth.set(id, 0);
    queue.push(id);
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depth.get(current)!;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!depth.has(neighbor)) {
        depth.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  let maxDepth = 0;
  for (const node of nodes) maxDepth = Math.max(maxDepth, depth.get(node.id) ?? 0);
  const ringSpacing = 200;

  const byDepth = new Map<number, FlowNode[]>();
  for (const node of nodes) {
    const d = depth.get(node.id) ?? maxDepth + 1;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(node);
  }

  const positioned: FlowNode[] = [];
  for (const [d, ring] of byDepth) {
    const radius = d * ringSpacing;
    ring.forEach((node, index) => {
      if (d === 0) {
        positioned.push({ ...node, position: { x: 0, y: 0 } });
        return;
      }
      const angle = (2 * Math.PI * index) / ring.length;
      positioned.push({
        ...node,
        position: { x: radius * Math.cos(angle), y: radius * Math.sin(angle) },
      });
    });
  }

  return positioned;
}

export function applyLayout(mode: GraphLayoutMode, nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  if (nodes.length === 0) return nodes;
  switch (mode) {
    case "hierarchical":
      return hierarchicalLayout(nodes, edges);
    case "radial":
      return radialLayout(nodes, edges);
    case "force":
    default:
      return forceLayout(nodes, edges);
  }
}
