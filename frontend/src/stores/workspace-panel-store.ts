import { create } from "zustand";
import { persist } from "zustand/middleware";

const MIN_WIDTH = 280;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 340;

interface WorkspacePanelState {
  inspectorCollapsed: boolean;
  inspectorWidth: number;
  toggleInspector: () => void;
  setInspectorCollapsed: (collapsed: boolean) => void;
  setInspectorWidth: (width: number) => void;
}

export const useWorkspacePanelStore = create<WorkspacePanelState>()(
  persist(
    (set) => ({
      inspectorCollapsed: false,
      inspectorWidth: DEFAULT_WIDTH,
      toggleInspector: () => set((s) => ({ inspectorCollapsed: !s.inspectorCollapsed })),
      setInspectorCollapsed: (collapsed) => set({ inspectorCollapsed: collapsed }),
      setInspectorWidth: (width) => set({ inspectorWidth: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)) }),
    }),
    { name: "r2c-workspace-panel-store" },
  ),
);

export { MIN_WIDTH as INSPECTOR_MIN_WIDTH, MAX_WIDTH as INSPECTOR_MAX_WIDTH };
