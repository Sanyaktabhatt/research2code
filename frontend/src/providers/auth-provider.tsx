"use client";

import * as React from "react";
import { refreshAccessToken } from "@/lib/api/client";
import { getRefreshToken } from "@/lib/auth/tokens";
import { SplashScreen } from "@/components/brand/splash-screen";

/**
 * Access tokens live in memory only (see lib/auth/tokens.ts), so a full
 * page reload loses them even though the refresh token survives in
 * localStorage. This silently exchanges it for a fresh access token
 * before rendering the app, so an authenticated user never bounces
 * through a visible logged-out flash.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isHydrating, setIsHydrating] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (getRefreshToken()) {
        await refreshAccessToken();
      }
      if (!cancelled) setIsHydrating(false);
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isHydrating) {
    return <SplashScreen />;
  }

  return children;
}
