"use client";

import { useEffect, useRef, useState } from "react";
import { createWsClient, type WsStatus } from "@/lib/ws/client";

interface UseResourceStreamOptions<TFrame, TState> {
  /** Build the WS path from the resource id, e.g. (id) => `/rag/sessions/${id}/stream` */
  path: (resourceId: string) => string;
  /** Fold an incoming frame into the running state. */
  reduce: (state: TState, frame: TFrame) => TState;
  initialState: TState;
  /** Disable the connection (e.g. resource id not yet known). */
  enabled?: boolean;
}

interface UseResourceStreamResult<TState> {
  state: TState;
  status: WsStatus;
  reset: () => void;
}

/**
 * Shared shape behind the RAG / orchestrator / codegen-progress streams:
 * open a socket scoped to one resource id, fold incremental frames into
 * local state, reconnect on drop. Callers flush `state` into the React
 * Query cache wherever they need it to survive an unmount.
 */
export function useResourceStream<TFrame, TState>(
  resourceId: string | undefined,
  { path, reduce, initialState, enabled = true }: UseResourceStreamOptions<TFrame, TState>,
): UseResourceStreamResult<TState> {
  const [state, setState] = useState<TState>(initialState);
  const [status, setStatus] = useState<WsStatus>("idle");
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;

  useEffect(() => {
    if (!resourceId || !enabled) return;

    const client = createWsClient({
      path: path(resourceId),
      onMessage: (frame) => {
        setState((prev) => reduceRef.current(prev, frame as TFrame));
      },
      onStatusChange: setStatus,
    });

    return () => client.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId, enabled]);

  return {
    state,
    status,
    reset: () => setState(initialState),
  };
}
