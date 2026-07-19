"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/error";
import { queryKeys } from "@/lib/query/keys";
import { clearTokens } from "@/lib/auth/tokens";

/**
 * Client-side complement to the middleware's cheap cookie check: if a
 * request mid-session comes back 401 (token expired + refresh failed),
 * this redirects to /login instead of leaving the UI stuck on stale data.
 */
export function useAuthGuard() {
  const router = useRouter();

  const query = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: getCurrentUser,
    retry: false,
  });

  useEffect(() => {
    if (query.error && ApiError.isApiError(query.error) && query.error.status === 401) {
      clearTokens();
      router.replace("/login");
    }
  }, [query.error, router]);

  return query;
}
