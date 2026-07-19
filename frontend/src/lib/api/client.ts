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
        if (!res.ok) {
          clearTokens();
          return null;
        }
        const data = (await res.json()) as { access_token: string; refresh_token: string };
        setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
        return data.access_token;
      })
      .catch(() => {
        clearTokens();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
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
      const data = (await response.json()) as { detail?: string };
      if (data.detail) detail = data.detail;
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
