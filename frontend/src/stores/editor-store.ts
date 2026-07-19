import { create } from "zustand";

export interface EditorTab {
  path: string;
  language: string;
  isDirty: boolean;
}

interface EditorState {
  tabs: EditorTab[];
  activePath: string | null;
  buffers: Record<string, string>;
  diffMode: boolean;
  openTab: (tab: EditorTab, initialContent: string) => void;
  closeTab: (path: string) => void;
  setActivePath: (path: string) => void;
  updateBuffer: (path: string, content: string) => void;
  toggleDiffMode: () => void;
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  tabs: [],
  activePath: null,
  buffers: {},
  diffMode: false,
  openTab: (tab, initialContent) => {
    const existing = get().tabs.find((t) => t.path === tab.path);
    set((s) => ({
      tabs: existing ? s.tabs : [...s.tabs, tab],
      buffers: { ...s.buffers, [tab.path]: s.buffers[tab.path] ?? initialContent },
      activePath: tab.path,
    }));
  },
  closeTab: (path) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.path !== path);
      const activePath = s.activePath === path ? (tabs[tabs.length - 1]?.path ?? null) : s.activePath;
      return { tabs, activePath };
    }),
  setActivePath: (path) => set({ activePath: path }),
  updateBuffer: (path, content) =>
    set((s) => ({
      buffers: { ...s.buffers, [path]: content },
      tabs: s.tabs.map((t) => (t.path === path ? { ...t, isDirty: true } : t)),
    })),
  toggleDiffMode: () => set((s) => ({ diffMode: !s.diffMode })),
}));
