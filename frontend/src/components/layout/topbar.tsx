"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Wordmark } from "@/components/brand/wordmark";
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
 * link - it lives in the account menu (UserMenu) and the command palette.
 */
export function Topbar({ fullBleed = false }: TopbarProps) {
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const pathname = usePathname();

  return (
    <header className="shrink-0 border-b border-border bg-card">
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 px-4 sm:px-6 lg:px-8",
          !fullBleed && "mx-auto w-full max-w-[calc(1400px+4rem)]",
        )}
      >
        <Link href="/dashboard" className="flex h-12 shrink-0 items-center gap-2.5 rounded-sm" aria-label="Research2Code home">
          <BrandMark size={24} />
          <Wordmark className="hidden sm:inline" />
        </Link>

        <nav aria-label="Primary" className="flex h-12 items-stretch gap-1 sm:ml-2">
          <NavLink href="/dashboard" label="Dashboard" active={pathname === "/dashboard"} />
          <NavLink
            href="/projects"
            label="Projects"
            active={pathname === "/projects" || pathname?.startsWith("/projects/") === true}
          />
        </nav>

        {/* Wraps to its own full-width row below md so the navbar never
            overflows a phone viewport, without hiding the switcher. */}
        <div className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center border-t border-border px-4 py-2 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 md:order-none md:mx-0 md:w-auto md:border-0 md:p-0">
          <div className="mr-4 hidden h-5 w-px bg-border md:block" aria-hidden="true" />
          <ProjectSwitcher />
        </div>

        <div className="ml-auto flex h-12 shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="hidden w-60 justify-start gap-2 bg-muted/60 font-normal text-muted-foreground shadow-none hover:bg-muted lg:flex"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search className="size-3.5" />
            Search…
            <kbd className="ml-auto rounded-sm border border-border bg-card px-1.5 py-px font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Search"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search className="size-4" />
          </Button>
          <ThemeToggle />
          <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
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
        "relative flex items-center rounded-sm px-2.5 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground",
        "after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-t-sm after:bg-transparent after:transition-colors hover:after:bg-border-strong",
        active && "font-semibold text-foreground after:bg-primary hover:after:bg-primary",
      )}
    >
      {label}
    </Link>
  );
}
