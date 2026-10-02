"use client";

import { LayoutDashboard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useUiStore } from "@/stores/ui-store";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The dashboard's page header - greeting, context line and global search entry point. Everything below this is detail. */
export function DashboardHeader() {
  const { data: user, isLoading } = useAuthGuard();
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);

  return (
    <div className="page-header">
      <div className="min-w-0">
        <p className="section-label flex items-center gap-1.5">
          <LayoutDashboard className="size-3" aria-hidden="true" />
          Research workspace
        </p>
        {isLoading ? (
          <Skeleton className="mt-2 h-8 w-64" />
        ) : (
          <h1 className="page-title mt-1.5">
            {greeting()}
            {user ? `, ${(user.full_name ?? user.email).split(" ")[0]}` : ""}
          </h1>
        )}
        <p className="page-description">Here&apos;s what&apos;s happening across your research projects.</p>
      </div>

      <Button
        variant="outline"
        className="justify-start gap-2 font-normal text-muted-foreground sm:w-72"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Search className="size-4" />
        Search projects, papers, runs…
        <kbd className="ml-auto rounded-sm border border-border bg-muted px-1.5 py-px font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
      </Button>
    </div>
  );
}
