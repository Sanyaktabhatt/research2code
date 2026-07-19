import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RepositoryTreeState {
  /** Expanded folder paths, keyed by generated-project id so each version remembers its own state. */
  expandedByProject: Record<string, string[]>;
  setExpanded: (projectId: string, expanded: string[]) => void;
  toggleFolder: (projectId: string, path: string) => void;
}

export const useRepositoryTreeStore = create<RepositoryTreeState>()(
  persist(
    (set, get) => ({
      expandedByProject: {},
      setExpanded: (projectId, expanded) =>
        set((s) => ({ expandedByProject: { ...s.expandedByProject, [projectId]: expanded } })),
      toggleFolder: (projectId, path) => {
        const current = get().expandedByProject[projectId] ?? [];
        const next = current.includes(path) ? current.filter((p) => p !== path) : [...current, path];
        set((s) => ({ expandedByProject: { ...s.expandedByProject, [projectId]: next } }));
      },
    }),
    { name: "r2c-repository-tree-store" },
  ),
);
