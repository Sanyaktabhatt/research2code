"use client";

import { AlertTriangle } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SplashScreen } from "@/components/brand/splash-screen";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { ApiError } from "@/lib/api/error";
import type { Breadcrumb } from "@/components/layout/breadcrumbs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ projectId?: string }>();
  const { data: user, isLoading, isError, error, refetch } = useAuthGuard();

  const breadcrumbs = useDashboardBreadcrumbs(pathname, params.projectId);

  // Every route under this layout is auth-gated (see middleware.ts's
  // PROTECTED_PREFIXES). Checking session validity once, here, before any
  // child page's own data hooks get a chance to mount, is what stops a
  // stale/missing session from producing a dashboard full of widgets each
  // independently 401ing and rendering their own "Not authenticated" error
  // card - previously every page fetched its own data with no shared guard,
  // so a session going bad meant N separate broken-looking widgets instead
  // of one clean bounce to /login.
  if (isLoading) {
    return <SplashScreen />;
  }

  if (isError) {
    // A 401 is handled by useAuthGuard's own effect (clears tokens, redirects
    // to /login) - this splash just covers the instant until that redirect
    // lands. Any other failure (backend unreachable, 5xx) is NOT evidence the
    // session itself is invalid, so it gets a real retry affordance instead
    // of either an unexplained infinite splash or silently rendering
    // children into the same doomed-request pattern this guard exists to
    // prevent.
    const isUnauthorized = ApiError.isApiError(error) && error.status === 401;
    if (isUnauthorized) return <SplashScreen />;

    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load your session"
          description={ApiError.isApiError(error) ? error.detail : "Something went wrong. Please try again."}
          action={
            <Button size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (!user) {
    return <SplashScreen />;
  }

  return (
    <AppShell breadcrumbs={breadcrumbs} fullBleed={Boolean(params.projectId)}>
      {children}
    </AppShell>
  );
}

function useDashboardBreadcrumbs(pathname: string, projectId: string | undefined): Breadcrumb[] {
  if (pathname.startsWith("/settings")) return [{ label: "Settings" }];
  if (pathname.startsWith("/dashboard")) return [{ label: "Dashboard" }];
  if (pathname.startsWith("/graph")) return [{ label: "Knowledge Graph Explorer" }];
  // Project name + active tab are shown by WorkspaceHeader inside the
  // workspace itself, so the outer chrome only needs to place you in
  // "Projects" - repeating them here would just duplicate that UI.
  if (projectId) return [{ label: "Projects", href: "/projects" }];
  return [{ label: "Projects" }];
}
