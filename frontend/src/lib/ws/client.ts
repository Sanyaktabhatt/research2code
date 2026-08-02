import { env } from "@/config/env";
import { WS_RECONNECT_BASE_DELAY_MS, WS_RECONNECT_MAX_DELAY_MS } from "@/config/constants";
import { getAccessToken } from "@/lib/auth/tokens";
import { refreshAccessToken } from "@/lib/api/client";

/**
 * `get_current_user_ws` rejects an expired/invalid `?token=` by closing
 * *before* the WebSocket handshake completes (see docs/API.md on why auth
 * has to travel as a query param at all). Browsers never surface the real
 * server-sent close code for a pre-handshake rejection - `event.code` in
 * `onclose` is always 1006 regardless of the actual reason, so there's no
 * way to detect "closed because auth failed" reactively from a close event.
 * Checking the token's own `exp` claim before connecting sidesteps that
 * entirely, catching it before the doomed connection attempt.
 */
function isTokenExpired(token: string, skewSeconds = 10): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp !== "number" || Date.now() >= (exp - skewSeconds) * 1000;
  } catch {
    return true;
  }
}

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

  const connect = async () => {
    setStatus("connecting");

    // React Strict Mode (dev only) mounts this effect, synchronously runs
    // its cleanup to verify one exists, then mounts it again - so the very
    // first `connect()` call is always thrown away. Yielding a tick before
    // ever touching the network lets that synchronous cleanup flip
    // `closedIntentionally` first, so the throwaway pass returns here
    // instead of opening (and immediately aborting) a real socket, which is
    // what produces the browser's "WebSocket is closed before the
    // connection is established" warning on every single page load.
    await Promise.resolve();
    if (closedIntentionally) return;

    let token = getAccessToken();
    if (!token || isTokenExpired(token)) {
      token = await refreshAccessToken();
    }
    // A closed-in-the-meantime client (e.g. `close()` called while the
    // refresh above was in flight) must not open a socket after the fact.
    if (closedIntentionally) return;

    const url = `${env.NEXT_PUBLIC_WS_BASE_URL}${path}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
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
