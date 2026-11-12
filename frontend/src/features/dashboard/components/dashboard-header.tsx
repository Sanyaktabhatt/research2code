"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { QuickActions } from "@/features/dashboard/components/quick-actions";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

/** The dashboard's page header - date, greeting and the primary actions. Global search lives in the top bar. */
export function DashboardHeader() {
  const { data: user, isLoading } = useAuthGuard();

  return (
    <div className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-xs text-muted-foreground" suppressHydrationWarning>
          {DATE_FORMAT.format(new Date())}
        </p>
        {isLoading ? (
          <Skeleton className="mt-2 h-9 w-72" />
        ) : (
          <h1 className="mt-1.5 text-[2rem] font-semibold leading-tight tracking-[-0.03em]">
            {greeting()}
            {user ? `, ${(user.full_name ?? user.email).split(" ")[0]}` : ""}
          </h1>
        )}
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening across your research projects.</p>
      </div>
      <QuickActions />
    </div>
  );
}
