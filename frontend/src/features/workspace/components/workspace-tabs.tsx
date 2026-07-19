"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { WORKSPACE_TABS, workspaceTabHref } from "@/config/nav";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { cn } from "@/lib/utils/cn";

function isTabActive(pathname: string, projectId: string, segment: string | null): boolean {
  const href = segment ? `/projects/${projectId}/${segment}` : `/projects/${projectId}`;
  return segment ? pathname.startsWith(href) : pathname === href;
}

/**
 * The workspace's tab navigation, rendered once in the left panel (the
 * spec's "Workspace navigation" section) - there's no second, horizontal
 * copy of these tabs elsewhere, since each tab is a real route and the URL
 * is the single source of truth for which one is active.
 */
export function WorkspaceTabs() {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();

  // WORKSPACE_TABS is a fixed, module-level constant (always 8 entries), so
  // this calls the same 8 hooks in the same order on every render.
  for (const tab of WORKSPACE_TABS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKeyboardShortcut({ key: String(tab.shortcut), mod: true }, () => {
      router.push(workspaceTabHref(params.projectId, tab));
    });
  }

  return (
    <nav className="space-y-0.5">
      {WORKSPACE_TABS.map((tab) => {
        const active = isTabActive(pathname, params.projectId, tab.segment);
        return (
          <Link
            key={tab.id}
            href={workspaceTabHref(params.projectId, tab)}
            className={cn(
              "group relative flex items-center justify-between gap-2 rounded-lg px-2.5 py-[7px] text-[13px] font-medium text-foreground/70 transition-colors duration-150 hover:text-foreground",
              active && "text-accent-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="workspace-tab-active-pill"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-lg bg-accent shadow-sm"
                aria-hidden="true"
              />
            )}
            {active && (
              <span className="absolute left-0 top-1/2 z-10 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gradient-brand" aria-hidden="true" />
            )}
            <span className="relative z-10 flex min-w-0 items-center gap-2.5">
              <tab.icon className="size-[17px] shrink-0 transition-transform duration-150 group-hover:scale-105" />
              <span className="truncate">{tab.label}</span>
            </span>
            <kbd className="relative z-10 shrink-0 font-mono text-[10px] font-medium text-muted-foreground/70">⌘{tab.shortcut}</kbd>
          </Link>
        );
      })}
    </nav>
  );
}
