"use client";

import { Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
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

/** The dashboard's hero - a landing moment, not a table caption. Everything below this is detail. */
export function DashboardHeader() {
  const { data: user, isLoading } = useAuthGuard();
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-spotlight px-6 py-8 sm:px-8 sm:py-10">
      <motion.div
        className="absolute -right-16 -top-16 size-56 rounded-full bg-gradient-brand opacity-20 blur-3xl animate-float-slow"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="size-3 text-primary" />
            Research workspace
          </div>
          {isLoading ? (
            <Skeleton className="h-10 w-72" />
          ) : (
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {greeting()}
              {user ? `, ${(user.full_name ?? user.email).split(" ")[0]}` : ""}
              <span className="text-gradient-brand">.</span>
            </h1>
          )}
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Here&apos;s what&apos;s happening across your research projects.
          </p>
        </div>

        <Button
          variant="outline"
          className="justify-start gap-2 border-border/70 bg-card/70 font-normal text-muted-foreground backdrop-blur sm:w-72"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="size-4" />
          Search projects, papers, runs…
          <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
        </Button>
      </div>
    </div>
  );
}
