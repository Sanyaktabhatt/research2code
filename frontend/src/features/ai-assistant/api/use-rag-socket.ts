"use client";

import * as React from "react";
import { createWsClient, type WsClient, type WsStatus } from "@/lib/ws/client";
import { useStreamingStore } from "@/stores/streaming-store";
import type { RAGQueryRequest, RagWsFrame } from "@/types/domain";

const RAG_WS_PATH = "/rag/ws";

/**
 * Owns one persistent `/rag/ws` connection for the assistant page's
 * lifetime (the backend reads one `RAGQueryRequest` per message over the
 * same socket and supports many turns - see rag.py's `while True` loop).
 * Raw frames are buffered into `useStreamingStore` (kind "rag", keyed by
 * conversation id) - the shared ephemeral-streaming-state store - so this
 * hook only owns connection lifecycle/turn bookkeeping, not chat state.
 */
export function useRagSocket() {
  const clientRef = React.useRef<WsClient | null>(null);
  const [status, setStatus] = React.useState<WsStatus>("idle");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const activeResourceIdRef = React.useRef<string | null>(null);
  const lastTurnRef = React.useRef<{ resourceId: string; request: RAGQueryRequest } | null>(null);

  const appendFrame = useStreamingStore((s) => s.appendFrame);
  const markDone = useStreamingStore((s) => s.markDone);
  const clearBuffer = useStreamingStore((s) => s.clear);

  const connect = React.useCallback(() => {
    clientRef.current = createWsClient({
      path: RAG_WS_PATH,
      onStatusChange: setStatus,
      onMessage: (raw) => {
        const resourceId = activeResourceIdRef.current;
        if (!resourceId) return;
        const frame = raw as RagWsFrame;
        appendFrame("rag", resourceId, frame);
        if (frame.type === "done" || frame.type === "error") {
          markDone("rag", resourceId);
          activeResourceIdRef.current = null;
          setIsStreaming(false);
        }
      },
    });
  }, [appendFrame, markDone]);

  React.useEffect(() => {
    connect();
    return () => clientRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = React.useCallback(
    (resourceId: string, request: RAGQueryRequest) => {
      clearBuffer("rag", resourceId);
      activeResourceIdRef.current = resourceId;
      lastTurnRef.current = { resourceId, request };
      setIsStreaming(true);
      clientRef.current?.send(request);
    },
    [clearBuffer],
  );

  const stop = React.useCallback(() => {
    const resourceId = activeResourceIdRef.current;
    activeResourceIdRef.current = null;
    setIsStreaming(false);
    if (resourceId) markDone("rag", resourceId);
    // No cancel frame exists server-side, and the connection reads one
    // request at a time - closing is the only real way to abort generation,
    // so reconnect immediately for the next turn.
    clientRef.current?.close();
    connect();
  }, [markDone, connect]);

  const retry = React.useCallback(() => {
    const last = lastTurnRef.current;
    if (last) ask(last.resourceId, last.request);
  }, [ask]);

  return { status, isStreaming, ask, stop, retry };
}
