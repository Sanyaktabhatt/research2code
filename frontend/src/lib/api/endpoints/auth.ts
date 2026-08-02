import { env, IS_MOCK_API } from "@/config/env";
import { apiFetch } from "@/lib/api/client";
import { MOCK_USER } from "@/lib/api/mock-data";
import type { User } from "@/types/domain";

export type OAuthProvider = "google" | "github";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload extends LoginPayload {
  full_name: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  if (IS_MOCK_API) {
    return mockDelay({ access_token: "mock.access.token", refresh_token: "mock.refresh.token" });
  }
  return apiFetch<TokenResponse>("/auth/login", { method: "POST", body: payload, skipAuth: true });
}

export async function signup(payload: SignupPayload): Promise<TokenResponse> {
  if (IS_MOCK_API) {
    return mockDelay({ access_token: "mock.access.token", refresh_token: "mock.refresh.token" });
  }
  return apiFetch<TokenResponse>("/auth/signup", { method: "POST", body: payload, skipAuth: true });
}

export async function getCurrentUser(): Promise<User> {
  if (IS_MOCK_API) {
    return mockDelay(MOCK_USER, 200);
  }
  return apiFetch<User>("/auth/me");
}

export interface UpdateProfilePayload {
  full_name: string;
}

export async function updateCurrentUser(payload: UpdateProfilePayload): Promise<User> {
  if (IS_MOCK_API) {
    return mockDelay({ ...MOCK_USER, ...payload }, 300);
  }
  return apiFetch<User>("/auth/me", { method: "PATCH", body: payload });
}

/** Providers with credentials actually configured server-side - see backend/app/api/v1/endpoints/auth.py's `/oauth/providers`. Mock mode has no real backend to redirect to, so it always reports none. */
export async function getOAuthProviders(): Promise<OAuthProvider[]> {
  if (IS_MOCK_API) {
    return mockDelay([], 100);
  }
  const { providers } = await apiFetch<{ providers: OAuthProvider[] }>("/auth/oauth/providers", { skipAuth: true });
  return providers;
}

/**
 * Not called via `fetch` - used directly as an `<a href>` for a full-page
 * navigation, since the provider's consent screen has to take over the
 * whole browser tab. The backend redirects back to `/auth/callback` (see
 * app/(auth)/auth/callback/page.tsx) once the provider round-trip
 * completes.
 */
export function oauthAuthorizeUrl(provider: OAuthProvider): string {
  return `${env.NEXT_PUBLIC_API_BASE_URL}/auth/oauth/${provider}/authorize`;
}
