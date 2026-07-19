import { create } from "zustand";

export type StreamKind = "rag" | "orchestrator" | "codegen" | "execution";

interface StreamBuffer {
  kind: StreamKind;
  resourceId: string;
  frames: unknown[];
  isDone: boolean;
}

interface StreamingState {
  buffers: Record<string, StreamBuffer>;
  appendFrame: (kind: StreamKind, resourceId: string, frame: unknown) => void;
  markDone: (kind: StreamKind, resourceId: string) => void;
  clear: (kind: StreamKind, resourceId: string) => void;
}

function bufferKey(kind: StreamKind, resourceId: string): string {
  return `${kind}:${resourceId}`;
}

export const useStreamingStore = create<StreamingState>()((set) => ({
  buffers: {},
  appendFrame: (kind, resourceId, frame) =>
    set((s) => {
      const key = bufferKey(kind, resourceId);
      const existing = s.buffers[key] ?? { kind, resourceId, frames: [], isDone: false };
      return {
        buffers: {
          ...s.buffers,
          [key]: { ...existing, frames: [...existing.frames, frame] },
        },
      };
    }),
  markDone: (kind, resourceId) =>
    set((s) => {
      const key = bufferKey(kind, resourceId);
      const existing = s.buffers[key];
      if (!existing) return s;
      return { buffers: { ...s.buffers, [key]: { ...existing, isDone: true } } };
    }),
  clear: (kind, resourceId) =>
    set((s) => {
      const key = bufferKey(kind, resourceId);
      const { [key]: _removed, ...rest } = s.buffers;
      return { buffers: rest };
    }),
}));
