"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { setTokens } from "@/lib/auth/tokens";
import { queryKeys } from "@/lib/query/keys";

/**
 * Lands here after a successful OAuth round-trip - the backend's callback
 * puts the freshly-issued tokens in the URL *fragment*
 * (`/auth/callback#access_token=...&refresh_token=...`), never a query
 * string, specifically so they're never sent to any server (including a
 * proxy/CDN in front of this app) on the request for this very page and
 * never appear in a server access log. `window.location.hash` is the only
 * way to read that, so this has to run client-side, after mount - there is
 * nothing to render server-side.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      router.replace("/login?oauth_error=unknown_error");
      return;
    }

    setTokens({ accessToken, refreshToken });
    // Clears the tokens from the visible URL/history entry immediately,
    // before anything else can read or log it.
    window.history.replaceState(null, "", "/auth/callback");

    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() }).finally(() => {
      router.replace("/dashboard");
    });
  }, [router, queryClient]);

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
