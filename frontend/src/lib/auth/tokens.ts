"use client";

import { AUTH_TOKEN_COOKIE, REFRESH_TOKEN_STORAGE_KEY } from "@/config/constants";
import { isBrowser } from "@/lib/utils/guards";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setTokens({ accessToken, refreshToken }: TokenPair): void {
  inMemoryAccessToken = accessToken;
  if (!isBrowser()) return;
  window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  // Non-httpOnly presence flag only — middleware uses this for a cheap
  // "is there probably a session" redirect, never for real authorization.
  document.cookie = `${AUTH_TOKEN_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearTokens(): void {
  inMemoryAccessToken = null;
  if (!isBrowser()) return;
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; max-age=0`;
}

export function hasSessionCookie(): boolean {
  if (!isBrowser()) return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${AUTH_TOKEN_COOKIE}=`));
}
