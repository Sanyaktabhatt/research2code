"use client";

import type { ReactNode } from "react";
import { CommandPalette } from "@/components/layout/command-palette";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Breadcrumb } from "@/components/layout/breadcrumbs";
import { ErrorBoundary } from "@/components/feedback/error-boundary";

interface AppShellProps {
  children: ReactNode;
  breadcrumbs?: Breadcrumb[];
  /** Full-bleed content that manages its own padding/scrolling per-panel (the project workspace) instead of the default padded, single-scroll main. */
  fullBleed?: boolean;
}

export function AppShell({ children, breadcrumbs, fullBleed = false }: AppShellProps) {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar breadcrumbs={breadcrumbs} />
        <main
          id="main-content"
          tabIndex={-1}
          className={fullBleed ? "min-h-0 flex-1 overflow-hidden outline-none" : "flex-1 overflow-y-auto p-6 outline-none"}
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
