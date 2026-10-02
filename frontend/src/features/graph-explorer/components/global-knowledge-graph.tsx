"use client";

import * as React from "react";
import Link from "next/link";
import { ReactFlowProvider, useEdgesState, useNodesState, Panel, type ReactFlowInstance } from "@xyflow/react";
import { AlertTriangle, ArrowRight, FolderPlus, Loader2, Network, RotateCcw, X } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { GraphCanvas } from "@/components/flow/graph-canvas";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGlobalGraphData, type GraphSource } from "@/features/graph-explorer/api/use-global-graph-data";
import { mergeProjectGraphs, projectColor, type ProjectGraphInput } from "@/features/graph-explorer/lib/merge-project-graphs";
import { filterGraph, isolatedNodeIds, neighborsOf, searchMatches } from "@/features/graph-explorer/lib/filter-search";
import { getNodeTypeStyle, type NodeTypeId } from "@/features/graph-explorer/lib/node-type-config";
import { GraphToolbar } from "@/features/graph-explorer/components/graph-toolbar";
import { GraphSearch } from "@/features/graph-explorer/components/graph-search";
import { GraphFilters } from "@/features/graph-explorer/components/graph-filters";
import { GraphLegend } from "@/features/graph-explorer/components/graph-legend";
import { DEFAULT_GRAPH_FILTERS, type FlowEdge, type FlowNode } from "@/features/graph-explorer/types";
import type { GraphLayoutMode } from "@/stores/graph-view-store";
import { cn } from "@/lib/utils/cn";

const ALL_PROJECTS = "all";
/** Above this many nodes, skip rendering off-screen elements. */
const LARGE_GRAPH_THRESHOLD = 300;

/**
 * Cross-project knowledge-graph explorer. Composes the same graph pieces as
 * the project-level view (canvas, search, filters, toolbar, legend) over the
 * merged graphs of every accessible project. Selection and layout state are
 * local, not the shared graph-view store, so this page never changes what a
 * project's own Graph tab shows.
 */
export function GlobalKnowledgeGraph() {
  const { isLoadingProjects, projectsError, retryProjects, sources } = useGlobalGraphData();

  const [projectFilter, setProjectFilter] = React.useState<string>(ALL_PROJECTS);
  const [filters, setFilters] = React.useState(DEFAULT_GRAPH_FILTERS);
  const [layoutMode, setLayoutMode] = React.useState<GraphLayoutMode>("force");
  const [hideIsolated, setHideIsolated] = React.useState(false);
  const [forcedVisible, setForcedVisible] = React.useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [flowInstance, setFlowInstance] = React.useState<ReactFlowInstance<FlowNode, FlowEdge> | null>(null);

  // `sources` is rebuilt every render, so derived values key off these
  // stable strings instead - otherwise every render would re-run the layout.
  const projectIdsKey = sources.map((s) => s.project.id).join("|");
  const loadedKey = sources
    .map((s) => (s.status.kind === "loaded" ? `${s.status.snapshot.knowledge_extraction_id}:${s.status.snapshot.version}` : s.status.kind))
    .join("|");

  // Colors follow each project's position in the full list, so they stay put when filtering.
  const colorByProject = React.useMemo(
    () => new Map(sources.map((source, index) => [source.project.id, projectColor(index)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectIdsKey],
  );

  const loadedInputs: ProjectGraphInput[] = React.useMemo(
    () =>
      sources.flatMap((source) =>
        source.status.kind === "loaded" && (projectFilter === ALL_PROJECTS || projectFilter === source.project.id)
          ? [
              {
                project: { id: source.project.id, name: source.project.name, color: colorByProject.get(source.project.id)! },
                snapshot: source.status.snapshot,
              },
            ]
          : [],
      ),
    // Recomputes only when a graph arrives or changes version, or the project filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadedKey, projectFilter, colorByProject],
  );

  const merged = React.useMemo(
    () => (loadedInputs.length > 0 ? mergeProjectGraphs(loadedInputs, layoutMode) : null),
    [loadedInputs, layoutMode],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  React.useEffect(() => {
    setNodes(merged?.nodes ?? []);
    setEdges(merged?.edges ?? []);
    setForcedVisible(new Set());
  }, [merged, setNodes, setEdges]);

  // A node filtered out by the project selector can't stay selected.
  React.useEffect(() => {
    if (selectedNodeId && !merged?.nodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [merged, selectedNodeId]);

  React.useEffect(() => {
    if (flowInstance && merged) requestAnimationFrame(() => flowInstance.fitView({ padding: 0.15, duration: 300 }));
  }, [flowInstance, merged]);

  const resetLayout = React.useCallback(() => {
    if (merged) setNodes(merged.nodes);
  }, [merged, setNodes]);

  const availableNodeTypes = React.useMemo(() => {
    const set = new Set<NodeTypeId>();
    for (const node of nodes) if (node.data.nodeType) set.add(node.data.nodeType);
    return [...set];
  }, [nodes]);

  const legendCounts = React.useMemo(() => {
    const counts: Partial<Record<NodeTypeId, number>> = {};
    for (const node of nodes) {
      if (node.data.nodeType) counts[node.data.nodeType] = (counts[node.data.nodeType] ?? 0) + 1;
    }
    return counts;
  }, [nodes]);

  const matchedIds = React.useMemo(() => searchMatches(nodes, filters.search), [nodes, filters.search]);
  const highlightIds = React.useMemo(
    () => (selectedNodeId && merged ? neighborsOf(selectedNodeId, merged.adjacency) : null),
    [selectedNodeId, merged],
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
      selected: node.id === selectedNodeId,
      data: { ...node.data, dimmed: highlightIds ? !highlightIds.has(node.id) : false, matched: matchedIds.has(node.id) },
    }));
  }, [filteredNodes, hideIsolated, isolatedIds, highlightIds, matchedIds, selectedNodeId]);

  const displayNodeIds = React.useMemo(() => new Set(displayNodes.map((n) => n.id)), [displayNodes]);
  const displayEdges = React.useMemo(
    () =>
      filteredEdges
        .filter((edge) => displayNodeIds.has(edge.source) && displayNodeIds.has(edge.target))
        .map((edge) => ({
          ...edge,
          data: { ...edge.data!, dimmed: highlightIds ? !(highlightIds.has(edge.source) && highlightIds.has(edge.target)) : false },
        })),
    [filteredEdges, displayNodeIds, highlightIds],
  );

  // Search highlights matches and re-centers on them (same behavior as the project view).
  React.useEffect(() => {
    if (!flowInstance || matchedIds.size === 0) return;
    const matchNodes = displayNodes.filter((n) => matchedIds.has(n.id));
    if (matchNodes.length > 0) flowInstance.fitView({ nodes: matchNodes, duration: 400, padding: 0.4, maxZoom: 1.2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedIds]);

  const selectNode = React.useCallback(
    (nodeId: string, center = false) => {
      setSelectedNodeId(nodeId);
      if (center && flowInstance) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) flowInstance.fitView({ nodes: [node], duration: 400, padding: 1.2, maxZoom: 1.2 });
      }
    },
    [flowInstance, nodes],
  );

  const handleExpandNeighbors = React.useCallback(() => {
    if (!selectedNodeId || !merged) return;
    const neighbors = neighborsOf(selectedNodeId, merged.adjacency);
    setForcedVisible((prev) => new Set([...prev, ...neighbors]));
  }, [selectedNodeId, merged]);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null;
  const settledCount = sources.filter((s) => s.status.kind !== "loading").length;
  const failedSources = sources.filter((s) => s.status.kind === "error");
  const loadedCount = sources.filter((s) => s.status.kind === "loaded").length;

  const header = (
    <div className="page-header">
      <div>
        <h1 className="page-title">Knowledge Graph Explorer</h1>
        <p className="page-description">
          Entities and relationships extracted from every project you have access to. Each project&apos;s graph is shown as its own cluster.
        </p>
      </div>
      {sources.length > 0 && (
        <p className="text-xs tabular-nums text-muted-foreground">
          {settledCount < sources.length ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Loading graphs · {settledCount}/{sources.length} projects
            </span>
          ) : (
            `${loadedCount} of ${sources.length} projects have a graph`
          )}
        </p>
      )}
    </div>
  );

  if (isLoadingProjects) {
    return (
      <div className="space-y-5">
        {header}
        <CardSkeleton className="h-[420px]" />
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="space-y-5">
        {header}
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load your projects"
          description={projectsError}
          action={
            <Button size="sm" variant="outline" onClick={retryProjects}>
              <RotateCcw />
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="space-y-5">
        {header}
        <EmptyState
          icon={Network}
          title="No projects yet"
          description="Create a project and upload a paper - its knowledge graph will appear here once extraction completes."
          action={
            <Button asChild size="sm">
              <Link href="/projects/new">
                <FolderPlus />
                New project
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="space-y-4">
        {header}

        {failedSources.length > 0 && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 border-l-4 border-l-destructive bg-destructive/[0.05] px-4 py-2.5 text-sm"
          >
            <p>
              <span className="font-medium text-foreground">
                {failedSources.length} {failedSources.length === 1 ? "project's graph" : "projects' graphs"} couldn&apos;t be loaded
              </span>
              <span className="text-muted-foreground"> - {failedSources.map((s) => s.project.name).join(", ")}. The graph below excludes them.</span>
            </p>
            <Button size="sm" variant="outline" onClick={() => failedSources.forEach((s) => s.retry())}>
              <RotateCcw />
              Retry failed
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <GraphSearch value={filters.search} onChange={(search) => setFilters((f) => ({ ...f, search }))} />
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-8 w-56" aria-label="Filter by project">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source.project.id} value={source.project.id} disabled={source.status.kind !== "loaded"}>
                    <span className="flex items-center gap-2">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colorByProject.get(source.project.id) }} aria-hidden="true" />
                      <span className="truncate">{source.project.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <GraphFilters
              filters={filters}
              onChange={setFilters}
              availableNodeTypes={availableNodeTypes}
              availableRelationshipTypes={merged?.relationshipTypes ?? []}
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
            snapshot={null}
            nodes={displayNodes}
            edges={displayEdges}
          />
        </div>

        <div className="flex flex-col gap-4 lg:h-[calc(100svh-18.5rem)] lg:min-h-[540px] lg:flex-row">
          <div className="h-[60svh] min-h-[420px] min-w-0 overflow-hidden rounded-lg border border-border shadow-xs lg:h-auto lg:flex-1">
            {merged ? (
              <GraphCanvas
                nodes={displayNodes}
                edges={displayEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => selectNode(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                onInit={setFlowInstance}
                onlyRenderVisibleElements={nodes.length > LARGE_GRAPH_THRESHOLD}
              >
                <Panel position="top-right">
                  <GraphLegend counts={legendCounts} />
                </Panel>
              </GraphCanvas>
            ) : settledCount < sources.length ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading knowledge graphs…
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyState
                  icon={Network}
                  title="No knowledge graphs built yet"
                  description="Graphs appear here once a project's paper is parsed and knowledge extraction completes. Each project's status is listed alongside."
                />
              </div>
            )}
          </div>

          <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs lg:w-80">
            {selectedNode ? (
              <NodeDetails
                node={selectedNode}
                edges={edges}
                nodes={nodes}
                onSelectNode={(id) => selectNode(id, true)}
                onClose={() => setSelectedNodeId(null)}
              />
            ) : (
              <SourcesPanel
                sources={sources}
                colorByProject={colorByProject}
                activeProject={projectFilter}
                onSelectProject={setProjectFilter}
              />
            )}
          </aside>
        </div>
      </div>
    </ReactFlowProvider>
  );
}

function sourceStatusLabel(source: GraphSource): { text: string; tone: "muted" | "ok" | "error" } {
  switch (source.status.kind) {
    case "loading":
      return { text: "Loading…", tone: "muted" };
    case "error":
      return { text: "Failed to load", tone: "error" };
    case "no-paper":
      return { text: "No paper uploaded", tone: "muted" };
    case "paper-not-ready":
      return { text: `Paper ${source.status.paperStatus}`, tone: "muted" };
    case "no-graph":
      return { text: "Graph not built yet", tone: "muted" };
    case "loaded":
      return {
        text: `${source.status.snapshot.nodes.length} nodes · ${source.status.snapshot.relationships.length} relationships`,
        tone: "ok",
      };
  }
}

function SourcesPanel({
  sources,
  colorByProject,
  activeProject,
  onSelectProject,
}: {
  sources: GraphSource[];
  colorByProject: Map<string, string>;
  activeProject: string;
  onSelectProject: (projectId: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="section-label">Projects</h2>
        {activeProject !== ALL_PROJECTS && (
          <button type="button" onClick={() => onSelectProject(ALL_PROJECTS)} className="rounded-sm text-xs font-medium text-info hover:underline">
            Show all
          </button>
        )}
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto scrollbar-thin">
        {sources.map((source) => {
          const label = sourceStatusLabel(source);
          const isLoaded = source.status.kind === "loaded";
          const isActive = activeProject === source.project.id;
          return (
            <li key={source.project.id} className={cn("flex items-start gap-2.5 px-4 py-2.5", isActive && "bg-accent/60")}>
              <span
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", !isLoaded && "opacity-30")}
                style={{ backgroundColor: colorByProject.get(source.project.id) }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                {isLoaded ? (
                  <button
                    type="button"
                    onClick={() => onSelectProject(isActive ? ALL_PROJECTS : source.project.id)}
                    className="break-words text-left text-[13px] font-medium text-foreground hover:text-info"
                    aria-pressed={isActive}
                  >
                    {source.project.name}
                  </button>
                ) : (
                  <p className="break-words text-[13px] font-medium text-foreground/70">{source.project.name}</p>
                )}
                <p
                  className={cn(
                    "text-xs tabular-nums",
                    label.tone === "error" ? "text-destructive" : "text-muted-foreground",
                  )}
                  title={source.status.kind === "error" ? source.status.message : undefined}
                >
                  {source.status.kind === "loading" && <Loader2 className="mr-1 inline size-3 animate-spin" aria-hidden="true" />}
                  {label.text}
                </p>
              </div>
              {source.status.kind === "error" && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={source.retry}>
                  <RotateCcw className="size-3.5" />
                  Retry
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function NodeDetails({
  node,
  nodes,
  edges,
  onSelectNode,
  onClose,
}: {
  node: FlowNode;
  nodes: FlowNode[];
  edges: FlowEdge[];
  onSelectNode: (id: string) => void;
  onClose: () => void;
}) {
  const style = getNodeTypeStyle(node.data.nodeType);
  const nameById = React.useMemo(() => new Map(nodes.map((n) => [n.id, n.data.name])), [nodes]);
  const relations = edges
    .filter((edge) => edge.source === node.id || edge.target === node.id)
    .map((edge) => {
      const outgoing = edge.source === node.id;
      const otherId = outgoing ? edge.target : edge.source;
      return { id: edge.id, type: edge.data!.relType, outgoing, otherId, otherName: nameById.get(otherId) ?? "Unknown" };
    });
  const properties = Object.entries(node.data.properties).filter(
    ([key, value]) => key !== "key" && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0),
  );

  return (
    <>
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="section-label">{style.label}</p>
          <h2 className="mt-1 break-words text-[15px] font-semibold leading-snug">{node.data.name}</h2>
        </div>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onClose} aria-label="Close details">
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 scrollbar-thin">
        {node.data.project && (
          <div>
            <p className="section-label">Source project</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: node.data.project.color }} aria-hidden="true" />
                <span className="break-words">{node.data.project.name}</span>
              </span>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-2.5 w-full">
              <Link href={`/projects/${node.data.project.id}/graph`}>
                Open project graph
                <ArrowRight />
              </Link>
            </Button>
          </div>
        )}

        <div>
          <p className="section-label">Relationships ({relations.length})</p>
          {relations.length === 0 ? (
            <p className="mt-1.5 text-xs text-muted-foreground">No connected relationships.</p>
          ) : (
            <ul className="mt-1.5 divide-y divide-border rounded-md border border-border">
              {relations.map((relation) => (
                <li key={relation.id}>
                  <button
                    type="button"
                    onClick={() => onSelectNode(relation.otherId)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-accent/50"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {relation.outgoing ? `${relation.type} →` : `← ${relation.type}`}
                    </span>
                    <span className="break-words text-[13px] text-foreground">{relation.otherName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {properties.length > 0 && (
          <div>
            <p className="section-label">Properties</p>
            <dl className="mt-1.5 space-y-2">
              {properties.map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[11px] text-muted-foreground">{key}</dt>
                  <dd className="break-words text-[13px]">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </>
  );
}
