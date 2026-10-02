import type { GraphSnapshot } from "@/types/domain";
import type { GraphLayoutMode } from "@/stores/graph-view-store";
import { buildFlowGraph, type BuiltGraph } from "@/features/graph-explorer/lib/build-flow-graph";
import { applyLayout } from "@/features/graph-explorer/lib/graph-layout";
import type { FlowEdge, FlowNode, GraphProjectRef } from "@/features/graph-explorer/types";

/**
 * Muted, distinguishable project indicator colors (mid-lightness so they read
 * on both the light and dark canvas). Assigned by the project's position in
 * the stable project list, so a project keeps its color across filters.
 */
const PROJECT_COLORS = [
  "hsl(211 62% 52%)",
  "hsl(174 52% 40%)",
  "hsl(258 42% 62%)",
  "hsl(28 78% 52%)",
  "hsl(338 48% 56%)",
  "hsl(145 40% 44%)",
  "hsl(196 64% 46%)",
  "hsl(48 70% 46%)",
];

export function projectColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length]!;
}

/** Node ids are namespaced per project - two papers can legitimately share an entity key (e.g. the same dataset). */
export function namespacedId(projectId: string, key: string): string {
  return `${projectId}::${key}`;
}

export interface ProjectGraphInput {
  project: GraphProjectRef;
  snapshot: GraphSnapshot;
}

export interface MergedGraph extends BuiltGraph {
  /** Node ids per project cluster, keyed by project id - used to fit the view to one project. */
  clusters: Map<string, { nodeIds: string[] }>;
}

const NODE_WIDTH = 224;
const NODE_HEIGHT = 60;
const CLUSTER_GAP = 240;

/**
 * Builds and lays out each project's graph independently, then arranges the
 * clusters in a grid so projects never overlap or interleave. Relationships
 * stay within their own project - the data has no cross-project edges, and
 * none are inferred.
 */
export function mergeProjectGraphs(inputs: ProjectGraphInput[], layoutMode: GraphLayoutMode): MergedGraph {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const adjacency = new Map<string, Set<string>>();
  const relationshipTypes = new Set<string>();
  const clusters = new Map<string, { nodeIds: string[] }>();

  const laidOut = inputs.map(({ project, snapshot }) => {
    const built = buildFlowGraph(snapshot);
    const prefix = (key: string) => namespacedId(project.id, key);

    const projectNodes: FlowNode[] = built.nodes.map((node) => ({
      ...node,
      id: prefix(node.id),
      data: { ...node.data, project },
    }));
    const projectEdges: FlowEdge[] = built.edges.map((edge) => ({
      ...edge,
      id: prefix(edge.id),
      source: prefix(edge.source),
      target: prefix(edge.target),
      data: { ...edge.data!, project },
    }));
    for (const [key, neighbors] of built.adjacency) {
      adjacency.set(prefix(key), new Set([...neighbors].map(prefix)));
    }
    built.relationshipTypes.forEach((type) => relationshipTypes.add(type));

    const positioned = applyLayout(layoutMode, projectNodes, projectEdges);
    const xs = positioned.map((n) => n.position.x);
    const ys = positioned.map((n) => n.position.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const width = Math.max(...xs) - minX + NODE_WIDTH;
    const height = Math.max(...ys) - minY + NODE_HEIGHT;
    return { project, nodes: positioned, edges: projectEdges, minX, minY, width, height };
  });

  // Row-wrapping grid: roughly square overall, clusters left-aligned per row.
  const totalArea = laidOut.reduce((sum, c) => sum + (c.width + CLUSTER_GAP) * (c.height + CLUSTER_GAP), 0);
  const targetRowWidth = Math.max(Math.sqrt(totalArea) * 1.4, ...laidOut.map((c) => c.width));
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  for (const cluster of laidOut) {
    if (cursorX > 0 && cursorX + cluster.width > targetRowWidth) {
      cursorX = 0;
      cursorY += rowHeight + CLUSTER_GAP;
      rowHeight = 0;
    }
    const dx = cursorX - cluster.minX;
    const dy = cursorY - cluster.minY;
    for (const node of cluster.nodes) {
      nodes.push({ ...node, position: { x: node.position.x + dx, y: node.position.y + dy } });
    }
    edges.push(...cluster.edges);
    clusters.set(cluster.project.id, { nodeIds: cluster.nodes.map((n) => n.id) });
    cursorX += cluster.width + CLUSTER_GAP;
    rowHeight = Math.max(rowHeight, cluster.height);
  }

  return { nodes, edges, adjacency, relationshipTypes: [...relationshipTypes].sort(), clusters };
}
