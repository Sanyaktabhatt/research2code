"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider, useNodesState, useEdgesState, Panel, type ReactFlowInstance } from "@xyflow/react";
import { FileWarning, Loader2, Share2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/feedback/empty-state";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { GraphCanvas } from "@/components/flow/graph-canvas";
import { useGraphExplorerData } from "@/features/graph-explorer/api/use-graph-explorer-data";
import { buildFlowGraph } from "@/features/graph-explorer/lib/build-flow-graph";
import { applyLayout } from "@/features/graph-explorer/lib/graph-layout";
import { filterGraph, isolatedNodeIds, neighborsOf, searchMatches } from "@/features/graph-explorer/lib/filter-search";
import { deriveNodeSource } from "@/features/graph-explorer/lib/derive-node-source";
import type { NodeTypeId } from "@/features/graph-explorer/lib/node-type-config";
import { GraphToolbar } from "@/features/graph-explorer/components/graph-toolbar";
import { GraphSearch } from "@/features/graph-explorer/components/graph-search";
import { GraphFilters } from "@/features/graph-explorer/components/graph-filters";
import { GraphLegend } from "@/features/graph-explorer/components/graph-legend";
import { DEFAULT_GRAPH_FILTERS, type FlowEdge, type FlowNode } from "@/features/graph-explorer/types";
import { usePaperViewerStore } from "@/features/paper-viewer/stores/use-paper-viewer-store";
import { useWorkspaceInspectorStore } from "@/stores/workspace-inspector-store";
import { useGraphViewStore } from "@/stores/graph-view-store";
import { workspaceTabHref, WORKSPACE_TABS } from "@/config/nav";

interface KnowledgeGraphProps {
  projectId: string;
}

/**
 * Top-level knowledge-graph explorer: fetches the project's paper graph,
 * lays it out with React Flow, and wires selection/search/filters into the
 * shared Context Inspector and Paper Viewer navigation store. Composed of
 * the reusable pieces in components/flow (canvas/node/edge/minimap) plus
 * this feature's own toolbar/search/filters/legend.
 */
export function KnowledgeGraph({ projectId }: KnowledgeGraphProps) {
  const router = useRouter();
  const setInspectorSelection = useWorkspaceInspectorStore((s) => s.setSelection);
  const clearInspectorSelection = useWorkspaceInspectorStore((s) => s.clear);

  const selectedNodeId = useGraphViewStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useGraphViewStore((s) => s.setSelectedNodeId);
  const layoutMode = useGraphViewStore((s) => s.layoutMode);
  const setLayoutMode = useGraphViewStore((s) => s.setLayoutMode);

  const { isLoading, isError, hasPaper, paperId, paperStatus, parsedPaper, isGraphLoading, graph } =
    useGraphExplorerData(projectId);

  const [filters, setFilters] = React.useState(DEFAULT_GRAPH_FILTERS);
  const [hideIsolated, setHideIsolated] = React.useState(false);
  const [forcedVisible, setForcedVisible] = React.useState<Set<string>>(new Set());
  const [flowInstance, setFlowInstance] = React.useState<ReactFlowInstance<FlowNode, FlowEdge> | null>(null);

  const built = React.useMemo(() => (graph ? buildFlowGraph(graph) : null), [graph]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  React.useEffect(() => {
    if (!built) {
      setNodes([]);
      setEdges([]);
      return;
    }
    setNodes(applyLayout(layoutMode, built.nodes, built.edges));
    setEdges(built.edges);
    setForcedVisible(new Set());
    // Layout only recomputes when the underlying graph or layout mode changes -
    // filters/search/selection are applied as a display-time overlay below, so
    // they never fight with drag positions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, layoutMode]);

  const resetLayout = React.useCallback(() => {
    if (!built) return;
    setNodes(applyLayout(layoutMode, built.nodes, built.edges));
  }, [built, layoutMode, setNodes]);

  const availableNodeTypes = React.useMemo(() => {
    const set = new Set<NodeTypeId>();
    for (const node of nodes) if (node.data.nodeType) set.add(node.data.nodeType);
    return [...set];
  }, [nodes]);

  const legendCounts = React.useMemo(() => {
    const counts: Partial<Record<NodeTypeId, number>> = {};
    for (const node of nodes) {
      if (!node.data.nodeType) continue;
      counts[node.data.nodeType] = (counts[node.data.nodeType] ?? 0) + 1;
    }
    return counts;
  }, [nodes]);

  const matchedIds = React.useMemo(() => searchMatches(nodes, filters.search), [nodes, filters.search]);
  const highlightIds = React.useMemo(
    () => (selectedNodeId && built ? neighborsOf(selectedNodeId, built.adjacency) : null),
    [selectedNodeId, built],
  );

  const { nodes: filteredNodes, edges: filteredEdges } = React.useMemo(
    () => filterGraph(nodes, edges, filters, forcedVisible),
    [nodes, edges, filters, forcedVisible],
  );

  const isolatedIds = React.useMemo(() => isolatedNodeIds(filteredNodes, filteredEdges), [filteredNodes, filteredEdges]);

  const displayNodes = React.useMemo(() => {
    const visible = hideIsolated ? filteredNodes.filter((n) => !isolatedIds.has(n.id)) : filteredNodes;
    return visible.map((node) => ({
      ...node,
      data: {
        ...node.data,
        dimmed: highlightIds ? !highlightIds.has(node.id) : false,
        matched: matchedIds.has(node.id),
      },
    }));
  }, [filteredNodes, hideIsolated, isolatedIds, highlightIds, matchedIds]);

  const displayNodeIds = React.useMemo(() => new Set(displayNodes.map((n) => n.id)), [displayNodes]);

  const displayEdges = React.useMemo(() => {
    return filteredEdges
      .filter((edge) => displayNodeIds.has(edge.source) && displayNodeIds.has(edge.target))
      .map((edge) => ({
        ...edge,
        data: {
          ...edge.data!,
          dimmed: highlightIds ? !(highlightIds.has(edge.source) && highlightIds.has(edge.target)) : false,
        },
      }));
  }, [filteredEdges, displayNodeIds, highlightIds]);

  // Search highlights matches and re-centers the view on them.
  React.useEffect(() => {
    if (!flowInstance || matchedIds.size === 0) return;
    const matchNodes = displayNodes.filter((n) => matchedIds.has(n.id));
    if (matchNodes.length === 0) return;
    flowInstance.fitView({ nodes: matchNodes, duration: 400, padding: 0.4, maxZoom: 1.2 });
    const first = matchNodes[0]!;
    setSelectedNodeId(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedIds]);

  const handleNodeClick = React.useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      setSelectedNodeId(node.id);
      setInspectorSelection({
        tab: "graph",
        nodeKey: node.data.key,
        labels: node.data.labels,
        properties: node.data.properties,
        incoming: node.data.incoming,
        outgoing: node.data.outgoing,
      });
    },
    [setSelectedNodeId, setInspectorSelection],
  );

  const handlePaneClick = React.useCallback(() => {
    setSelectedNodeId(null);
    clearInspectorSelection();
  }, [setSelectedNodeId, clearInspectorSelection]);

  const handleNodeDoubleClick = React.useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      if (!parsedPaper || !paperId) {
        toast.info("Open the Paper tab once parsing completes to jump to source text.");
        return;
      }
      const source = deriveNodeSource(node, parsedPaper.pages, parsedPaper.sections);
      if (!source) {
        toast.info("Couldn't find this entity's exact text in the paper.");
        return;
      }
      usePaperViewerStore.getState().setCurrentPage(paperId, source.pageNumber);
      usePaperViewerStore.getState().setFocus(
        source.sectionName
          ? { kind: "section", name: source.sectionName, startPage: source.pageNumber, endPage: source.pageNumber }
          : { kind: "page", pageNumber: source.pageNumber },
      );
      const paperTab = WORKSPACE_TABS.find((t) => t.id === "paper")!;
      router.push(workspaceTabHref(projectId, paperTab));
    },
    [parsedPaper, paperId, projectId, router],
  );

  const handleExpandNeighbors = React.useCallback(() => {
    if (!selectedNodeId || !built) return;
    const neighbors = neighborsOf(selectedNodeId, built.adjacency);
    setForcedVisible((prev) => new Set([...prev, ...neighbors]));
  }, [selectedNodeId, built]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton className="sm:col-span-2" />
      </div>
    );
  }

  if (isError) {
    return <EmptyState icon={FileWarning} title="Couldn't load the knowledge graph" description="Something went wrong fetching this project's graph." />;
  }

  if (!hasPaper) {
    return <EmptyState icon={UploadCloud} title="No paper uploaded yet" description="Upload a paper first, then trigger knowledge extraction to build its graph." />;
  }

  if (paperStatus !== "completed") {
    return <EmptyState icon={Loader2} title="Waiting on parsing" description="The knowledge graph builds once the paper finishes parsing and extraction." />;
  }

  if (isGraphLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton className="sm:col-span-2" />
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <EmptyState
        icon={Share2}
        title="No graph built yet"
        description="Trigger knowledge extraction from the Overview tab's quick actions to build this paper's graph."
      />
    );
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-[calc(100vh-14rem)] min-h-[520px] flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <GraphSearch value={filters.search} onChange={(search) => setFilters((f) => ({ ...f, search }))} />
            <GraphFilters
              filters={filters}
              onChange={setFilters}
              availableNodeTypes={availableNodeTypes}
              availableRelationshipTypes={built?.relationshipTypes ?? []}
            />
          </div>
          <GraphToolbar
            layoutMode={layoutMode}
            onLayoutModeChange={setLayoutMode}
            onResetLayout={resetLayout}
            onExpandNeighbors={handleExpandNeighbors}
            canExpandNeighbors={Boolean(selectedNodeId)}
            hideIsolated={hideIsolated}
            onToggleHideIsolated={() => setHideIsolated((v) => !v)}
            snapshot={graph}
            nodes={displayNodes}
            edges={displayEdges}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border shadow-xs">
          <GraphCanvas
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onPaneClick={handlePaneClick}
            onInit={setFlowInstance}
          >
            <Panel position="top-right">
              <GraphLegend counts={legendCounts} />
            </Panel>
          </GraphCanvas>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
