"use client";

import { Search } from "lucide-react";
import { Breadcrumbs, type Breadcrumb } from "@/components/layout/breadcrumbs";
import { ProjectSwitcher } from "@/components/layout/project-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";

interface TopbarProps {
  breadcrumbs?: Breadcrumb[];
}

export function Topbar({ breadcrumbs = [] }: TopbarProps) {
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);

  return (
    <header className="relative flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-brand opacity-40" aria-hidden="true" />
      <div className="flex min-w-0 items-center gap-3">
        <ProjectSwitcher />
        <Breadcrumbs items={breadcrumbs} className="hidden md:flex" />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 font-normal text-muted-foreground sm:flex"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="size-3.5" />
          Search…
          <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="sm:hidden"
          aria-label="Search"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="size-4" />
        </Button>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
