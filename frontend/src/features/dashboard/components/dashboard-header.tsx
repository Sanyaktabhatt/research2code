"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/use-auth-guard";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

/** Greeting and the one primary action. Everything else lives in the top bar and command palette. */
export function DashboardHeader() {
  const { data: user, isLoading } = useAuthGuard();

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-xs text-muted-foreground" suppressHydrationWarning>
          {DATE_FORMAT.format(new Date())}
        </p>
        {isLoading ? (
          <Skeleton className="mt-3 h-9 w-72" />
        ) : (
          <h1 className="mt-2.5 text-[2rem] font-semibold leading-tight tracking-[-0.03em]">
            {greeting()}
            {user ? `, ${(user.full_name ?? user.email).split(" ")[0]}` : ""}
          </h1>
        )}
      </div>
      <Button asChild size="lg" className="w-fit">
        <Link href="/projects/new">
          <Plus />
          New project
        </Link>
      </Button>
    </div>
  );
}
