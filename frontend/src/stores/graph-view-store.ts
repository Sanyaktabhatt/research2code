import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GraphLayoutMode = "force" | "hierarchical" | "radial";

interface GraphViewState {
  selectedNodeId: string | null;
  layoutMode: GraphLayoutMode;
  viewportByProject: Record<string, { x: number; y: number; zoom: number }>;
  setSelectedNodeId: (id: string | null) => void;
  setLayoutMode: (mode: GraphLayoutMode) => void;
  setViewport: (projectId: string, viewport: { x: number; y: number; zoom: number }) => void;
}

export const useGraphViewStore = create<GraphViewState>()(
  persist(
    (set) => ({
      selectedNodeId: null,
      layoutMode: "force",
      viewportByProject: {},
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      setLayoutMode: (mode) => set({ layoutMode: mode }),
      setViewport: (projectId, viewport) =>
        set((s) => ({ viewportByProject: { ...s.viewportByProject, [projectId]: viewport } })),
    }),
    { name: "r2c-graph-view-store" },
  ),
);
