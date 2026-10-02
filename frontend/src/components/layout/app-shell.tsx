"use client";

import type { ReactNode } from "react";
import { CommandPalette } from "@/components/layout/command-palette";
import { Topbar } from "@/components/layout/topbar";
import { Breadcrumbs, type Breadcrumb } from "@/components/layout/breadcrumbs";
import { ErrorBoundary } from "@/components/feedback/error-boundary";

interface AppShellProps {
  children: ReactNode;
  breadcrumbs?: Breadcrumb[];
  /** Full-bleed content that manages its own padding/scrolling per-panel (the project workspace) instead of the default padded, single-scroll main. */
  fullBleed?: boolean;
}

export function AppShell({ children, breadcrumbs = [], fullBleed = false }: AppShellProps) {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Topbar fullBleed={fullBleed} />
      <main
        id="main-content"
        tabIndex={-1}
        className={fullBleed ? "min-h-0 flex-1 overflow-hidden outline-none" : "min-h-0 flex-1 overflow-y-auto px-4 py-5 outline-none scrollbar-thin sm:px-6 lg:px-8"}
      >
        {fullBleed ? (
          // The workspace header renders its own "Projects / <name>" path.
          <ErrorBoundary>{children}</ErrorBoundary>
        ) : (
          <div className="mx-auto w-full max-w-[1400px]">
            {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className="mb-3" />}
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        )}
      </main>
      <CommandPalette />
    </div>
  );
}
