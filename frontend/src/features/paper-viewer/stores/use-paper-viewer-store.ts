import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FitMode, FocusSelection } from "@/features/paper-viewer/types";

const ZOOM_MIN = 50;
const ZOOM_MAX = 250;
const ZOOM_STEP = 10;
const DEFAULT_LEFT_WIDTH = 280;
const LEFT_WIDTH_MIN = 220;
const LEFT_WIDTH_MAX = 420;

interface PerPaperState {
  zoom: number;
  currentPage: number;
  leftWidth: number;
}

const DEFAULT_PER_PAPER: PerPaperState = { zoom: 100, currentPage: 1, leftWidth: DEFAULT_LEFT_WIDTH };

interface PaperViewerState {
  byPaper: Record<string, PerPaperState>;
  rotation: 0 | 90 | 180 | 270;
  fitMode: FitMode;
  focus: FocusSelection | null;
  searchOpen: boolean;
  searchQuery: string;

  getState: (paperId: string) => PerPaperState;
  setZoom: (paperId: string, zoom: number) => void;
  zoomIn: (paperId: string) => void;
  zoomOut: (paperId: string) => void;
  setCurrentPage: (paperId: string, page: number) => void;
  setLeftWidth: (paperId: string, width: number) => void;
  setRotation: (rotation: 0 | 90 | 180 | 270) => void;
  rotateClockwise: () => void;
  setFitMode: (mode: FitMode) => void;
  setFocus: (focus: FocusSelection | null) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const usePaperViewerStore = create<PaperViewerState>()(
  persist(
    (set, get) => ({
      byPaper: {},
      rotation: 0,
      fitMode: "width",
      focus: null,
      searchOpen: false,
      searchQuery: "",

      getState: (paperId) => get().byPaper[paperId] ?? DEFAULT_PER_PAPER,

      setZoom: (paperId, zoom) =>
        set((s) => ({
          byPaper: {
            ...s.byPaper,
            [paperId]: { ...(s.byPaper[paperId] ?? DEFAULT_PER_PAPER), zoom: clamp(zoom, ZOOM_MIN, ZOOM_MAX) },
          },
          fitMode: "custom",
        })),

      zoomIn: (paperId) => get().setZoom(paperId, get().getState(paperId).zoom + ZOOM_STEP),
      zoomOut: (paperId) => get().setZoom(paperId, get().getState(paperId).zoom - ZOOM_STEP),

      setCurrentPage: (paperId, page) =>
        set((s) => ({
          byPaper: {
            ...s.byPaper,
            [paperId]: { ...(s.byPaper[paperId] ?? DEFAULT_PER_PAPER), currentPage: Math.max(1, page) },
          },
        })),

      setLeftWidth: (paperId, width) =>
        set((s) => ({
          byPaper: {
            ...s.byPaper,
            [paperId]: {
              ...(s.byPaper[paperId] ?? DEFAULT_PER_PAPER),
              leftWidth: clamp(width, LEFT_WIDTH_MIN, LEFT_WIDTH_MAX),
            },
          },
        })),

      setRotation: (rotation) => set({ rotation }),
      rotateClockwise: () => set((s) => ({ rotation: ((s.rotation + 90) % 360) as 0 | 90 | 180 | 270 })),
      setFitMode: (fitMode) => set({ fitMode }),
      setFocus: (focus) => set({ focus }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
    }),
    {
      name: "r2c-paper-viewer-store",
      partialize: (s) => ({ byPaper: s.byPaper }),
    },
  ),
);

export { LEFT_WIDTH_MIN, LEFT_WIDTH_MAX, ZOOM_MIN, ZOOM_MAX };
