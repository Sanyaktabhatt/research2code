"use client";

import { useParams, usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import type { Breadcrumb } from "@/components/layout/breadcrumbs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ projectId?: string }>();

  const breadcrumbs = useDashboardBreadcrumbs(pathname, params.projectId);

  return (
    <AppShell breadcrumbs={breadcrumbs} fullBleed={Boolean(params.projectId)}>
      {children}
    </AppShell>
  );
}

function useDashboardBreadcrumbs(pathname: string, projectId: string | undefined): Breadcrumb[] {
  if (pathname.startsWith("/settings")) return [{ label: "Settings" }];
  if (pathname.startsWith("/dashboard")) return [{ label: "Dashboard" }];
  // Project name + active tab are shown by WorkspaceHeader inside the
  // workspace itself, so the outer chrome only needs to place you in
  // "Projects" - repeating them here would just duplicate that UI.
  if (projectId) return [{ label: "Projects", href: "/projects" }];
  return [{ label: "Projects" }];
}
