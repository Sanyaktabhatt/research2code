import { env, IS_MOCK_API } from "@/config/env";
import { ApiError } from "@/lib/api/error";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/tokens";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip the Authorization header (login/signup/refresh). */
  skipAuth?: boolean;
  /** Skip the automatic 401 -> refresh -> retry-once flow. */
  skipRefresh?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (IS_MOCK_API) {
    // The mock login flow never produced a token a real backend would
    // recognize, so there's nothing to actually refresh against - just
    // re-establish the same mock access token used at login.
    setTokens({ accessToken: "mock.access.token", refreshToken: "mock.refresh.token" });
    return "mock.access.token";
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (res) => {
        // Only a genuine rejection of the refresh token itself - 401 (expired,
        // revoked, malformed) or 403 (account deactivated) - means the session
        // is actually over. Any other non-2xx (a backend mid-restart 502/503,
        // a proxy hiccup) is not evidence of that, and must not wipe the one
        // credential a later retry needs. Clearing tokens here otherwise
        // silently logs a user out just because the backend was briefly
        // unreachable.
        if (res.status === 401 || res.status === 403) {
          clearTokens();
          return null;
        }
        if (!res.ok) return null;
        const data = (await res.json()) as { access_token: string; refresh_token: string };
        setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
        return data.access_token;
      })
      .catch(() => {
        // fetch() itself threw - a network-level failure (offline, DNS,
        // connection reset), not a rejection from the server. Same reasoning
        // as the non-401 branch above: leave the refresh token in place.
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

/**
 * `detail` is a plain string for every error this app's own code raises
 * (`raise HTTPException(detail=str(exc))` throughout the backend), but
 * FastAPI's *automatic* request-body validation - triggered before an
 * endpoint even runs, e.g. a signup password failing `min_length` - returns
 * its own 422 shape instead: `{"detail": [{"type","loc","msg","input","ctx"}, ...]}`,
 * an *array* of Pydantic error objects, not a string. Passing that through
 * un-normalized left every caller rendering `error.detail` straight into
 * JSX, which crashes the whole page ("Objects are not valid as a React
 * child") the moment a validation 422 happens instead of showing a message.
 */
function extractErrorDetail(data: unknown): string | null {
  if (typeof data !== "object" || data === null || !("detail" in data)) return null;
  const detail = (data as { detail?: unknown }).detail;

  if (typeof detail === "string" && detail) return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (typeof entry !== "object" || entry === null) return null;
        const { msg, loc } = entry as { msg?: unknown; loc?: unknown };
        const field = Array.isArray(loc) ? loc.filter((part) => part !== "body").join(".") : null;
        if (typeof msg !== "string") return null;
        return field ? `${field}: ${msg}` : msg;
      })
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) return messages.join("; ");
  }

  return null;
}

function requestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, skipRefresh, headers, ...rest } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const doFetch = async (): Promise<Response> => {
    const finalHeaders = new Headers(headers);
    // Let the browser set Content-Type (incl. multipart boundary) for FormData bodies.
    if (!isFormData) finalHeaders.set("Content-Type", "application/json");
    finalHeaders.set("X-Request-ID", requestId());

    if (!skipAuth) {
      const token = getAccessToken();
      if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let response = await doFetch();

  if (response.status === 401 && !skipAuth && !skipRefresh) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await doFetch();
    }
  }

  const requestIdHeader = response.headers.get("X-Request-ID") ?? undefined;

  if (!response.ok) {
    let detail = "Internal server error";
    try {
      const data: unknown = await response.json();
      detail = extractErrorDetail(data) ?? detail;
    } catch {
      // non-JSON error body, keep default detail
    }
    throw new ApiError(response.status, detail, requestIdHeader);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * For "this resource hasn't happened yet" reads (e.g. no knowledge
 * extraction triggered yet), where a 404/409 is expected application state,
 * not a failure - returns null instead of throwing so callers don't have to
 * catch it just to distinguish "not ready" from a real error.
 */
export async function apiFetchOrNull<T>(
  path: string,
  toleratedStatuses: number[] = [404],
  options?: RequestOptions,
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    if (ApiError.isApiError(error) && toleratedStatuses.includes(error.status)) {
      return null;
    }
    throw error;
  }
}
