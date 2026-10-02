"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand/wordmark";
import { ProjectSwitcher } from "@/components/layout/project-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils/cn";

interface TopbarProps {
  /** Matches AppShell's content container: full width for the project workspace, constrained otherwise, so the brand lines up with the page heading. */
  fullBleed?: boolean;
}

/**
 * The app's only global navigation. Settings is intentionally not a top-level
 * link - it lives in the account menu (UserMenu) and the command palette. The
 * Knowledge Graph Explorer (/graph) is likewise reached from the dashboard's
 * "Explore a graph" action and the command palette rather than a nav link.
 */
export function Topbar({ fullBleed = false }: TopbarProps) {
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const pathname = usePathname();

  return (
    <header className="shrink-0 border-b border-border bg-card">
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-2 px-4 sm:gap-x-5 sm:px-6 lg:px-8",
          !fullBleed && "mx-auto w-full max-w-[calc(1400px+4rem)]",
        )}
      >
        <Link
          href="/dashboard"
          className="flex h-16 shrink-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-[72px]"
          aria-label="Research2Code home"
        >
          <Logo size="md" collapseOnMobile />
        </Link>

        <nav aria-label="Primary" className="flex h-16 items-stretch gap-1 sm:ml-3 sm:gap-2 md:h-[72px]">
          <NavLink href="/dashboard" label="Dashboard" active={pathname === "/dashboard"} />
          <NavLink
            href="/projects"
            label="Projects"
            active={pathname === "/projects" || pathname?.startsWith("/projects/") === true}
          />
        </nav>

        {/* Wraps to its own full-width row below lg so the navbar never
            overflows a phone or tablet viewport, without hiding the switcher. */}
        <div className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center border-t border-border px-4 py-2.5 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:order-none lg:mx-0 lg:w-auto lg:border-0 lg:p-0">
          <div className="mr-5 hidden h-7 w-px bg-border lg:block" aria-hidden="true" />
          <ProjectSwitcher />
        </div>

        <div className="ml-auto flex h-16 shrink-0 items-center gap-0.5 sm:gap-1.5 md:h-[72px]">
          <Button
            variant="outline"
            className="hidden w-64 justify-start gap-2 bg-muted/60 font-normal text-muted-foreground shadow-none hover:bg-muted xl:flex"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search className="size-4" />
            Search…
            <kbd className="ml-auto rounded-sm border border-border bg-card px-1.5 py-px font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 sm:size-9 xl:hidden"
            aria-label="Search"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search className="size-4" />
          </Button>
          <ThemeToggle />
          <div className="mx-0.5 h-6 w-px bg-border sm:mx-1.5" aria-hidden="true" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex shrink-0 items-center whitespace-nowrap outline-none",
        // Active marker: a restrained orange underline flush with the navbar's bottom border.
        "after:absolute after:inset-x-1 after:bottom-0 after:h-[3px] after:rounded-t-sm after:bg-transparent after:transition-colors",
        active && "after:bg-primary",
      )}
    >
      <span
        className={cn(
          "rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 sm:px-3.5 sm:text-[15px]",
          "group-hover:bg-accent group-hover:text-foreground",
          "group-focus-visible:ring-2 group-focus-visible:ring-ring",
          active && "font-semibold text-foreground",
        )}
      >
        {label}
      </span>
    </Link>
  );
}
