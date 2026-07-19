"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { useReactFlow } from "@xyflow/react";
import { Download, FileJson, Maximize, Scan, Ungroup, Waypoints } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LayoutSelector } from "@/features/graph-explorer/components/layout-selector";
import type { GraphLayoutMode } from "@/stores/graph-view-store";
import type { FlowEdge, FlowNode } from "@/features/graph-explorer/types";
import type { GraphSnapshot } from "@/types/domain";

function ToolbarButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={active ? "secondary" : "outline"} size="icon" onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

interface GraphToolbarProps {
  layoutMode: GraphLayoutMode;
  onLayoutModeChange: (mode: GraphLayoutMode) => void;
  onResetLayout: () => void;
  onExpandNeighbors: () => void;
  canExpandNeighbors: boolean;
  hideIsolated: boolean;
  onToggleHideIsolated: () => void;
  snapshot: GraphSnapshot | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export function GraphToolbar({
  layoutMode,
  onLayoutModeChange,
  onResetLayout,
  onExpandNeighbors,
  canExpandNeighbors,
  hideIsolated,
  onToggleHideIsolated,
  snapshot,
  nodes,
  edges,
}: GraphToolbarProps) {
  const { fitView } = useReactFlow();

  const handleExportPng = React.useCallback(() => {
    const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
    const pane = document.querySelector<HTMLElement>(".react-flow");
    if (!viewport) return;
    const backgroundColor = pane ? getComputedStyle(pane).backgroundColor : "#ffffff";
    toPng(viewport, { backgroundColor })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `knowledge-graph-${snapshot?.paper_id ?? "export"}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch(() => toast.error("Couldn't export the graph as PNG."));
  }, [snapshot]);

  const handleExportJson = React.useCallback(() => {
    const payload = {
      paper_id: snapshot?.paper_id ?? null,
      version: snapshot?.version ?? null,
      nodes: nodes.map((n) => ({ key: n.id, labels: n.data.labels, properties: n.data.properties })),
      relationships: edges.map((e) => ({ type: e.data!.relType, start_key: e.source, end_key: e.target, properties: e.data!.properties })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `knowledge-graph-${snapshot?.paper_id ?? "export"}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [snapshot, nodes, edges]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LayoutSelector value={layoutMode} onChange={onLayoutModeChange} />
      <ToolbarButton label="Fit graph" onClick={() => fitView({ duration: 400, padding: 0.15 })}>
        <Scan className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Reset layout" onClick={onResetLayout}>
        <Maximize className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Expand neighbors of selected node" onClick={onExpandNeighbors} disabled={!canExpandNeighbors}>
        <Waypoints className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Collapse isolated nodes" onClick={onToggleHideIsolated} active={hideIsolated}>
        <Ungroup className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Export as PNG" onClick={handleExportPng}>
        <Download className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Export graph JSON" onClick={handleExportJson}>
        <FileJson className="size-4" />
      </ToolbarButton>
    </div>
  );
}
