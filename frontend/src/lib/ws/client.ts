import { env } from "@/config/env";
import { WS_RECONNECT_BASE_DELAY_MS, WS_RECONNECT_MAX_DELAY_MS } from "@/config/constants";
import { getAccessToken } from "@/lib/auth/tokens";

export type WsStatus = "idle" | "connecting" | "open" | "closed" | "error";

export interface WsClientOptions {
  /** Path relative to the WS base URL, e.g. "/rag/sessions/123/stream" */
  path: string;
  onMessage: (data: unknown) => void;
  onStatusChange?: (status: WsStatus) => void;
  /** Auto-reconnect with exponential backoff until closed intentionally. */
  reconnect?: boolean;
}

export interface WsClient {
  close: () => void;
  status: () => WsStatus;
  /** JSON-encodes and sends over the socket; queued and flushed on open if it isn't connected yet. */
  send: (data: unknown) => void;
}

/**
 * Backend WebSocket endpoints can't receive custom headers during the
 * handshake, so auth travels as a `?token=` query param (see docs/API.md).
 */
export function createWsClient({ path, onMessage, onStatusChange, reconnect = true }: WsClientOptions): WsClient {
  let socket: WebSocket | null = null;
  let attempt = 0;
  let closedIntentionally = false;
  let status: WsStatus = "idle";
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingQueue: unknown[] = [];

  const setStatus = (next: WsStatus) => {
    status = next;
    onStatusChange?.(next);
  };

  const connect = () => {
    const token = getAccessToken();
    const url = `${env.NEXT_PUBLIC_WS_BASE_URL}${path}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

    setStatus("connecting");
    socket = new WebSocket(url);

    socket.onopen = () => {
      attempt = 0;
      setStatus("open");
      const queued = pendingQueue;
      pendingQueue = [];
      for (const data of queued) socket?.send(JSON.stringify(data));
    };

    socket.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch {
        onMessage(event.data);
      }
    };

    socket.onerror = () => {
      setStatus("error");
    };

    socket.onclose = () => {
      setStatus("closed");
      if (!closedIntentionally && reconnect) {
        const delay = Math.min(WS_RECONNECT_BASE_DELAY_MS * 2 ** attempt, WS_RECONNECT_MAX_DELAY_MS);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      }
    };
  };

  connect();

  return {
    close: () => {
      closedIntentionally = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    },
    status: () => status,
    send: (data) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
      } else {
        pendingQueue.push(data);
      }
    },
  };
}
