import { IS_MOCK_API } from "@/config/env";
import { apiFetch } from "@/lib/api/client";
import { MOCK_USER } from "@/lib/api/mock-data";
import type { User } from "@/types/domain";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload extends LoginPayload {
  displayName: string;
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
