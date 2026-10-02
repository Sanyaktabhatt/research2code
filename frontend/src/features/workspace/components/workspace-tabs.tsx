"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
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
    <nav aria-label="Workspace" className="-mx-2 space-y-px">
      {WORKSPACE_TABS.map((tab) => {
        const active = isTabActive(pathname, params.projectId, tab.segment);
        return (
          <Link
            key={tab.id}
            href={workspaceTabHref(params.projectId, tab)}
            className={cn(
              "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-foreground/80 outline-none transition-colors duration-100",
              "hover:bg-accent/70 hover:text-foreground",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              active && "bg-accent font-semibold text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <tab.icon
              className={cn(
                "size-[18px] shrink-0 transition-colors",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80",
              )}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate" title={tab.label}>
              {tab.label}
            </span>
            <kbd
              className={cn(
                "shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/60 transition-colors group-hover:text-muted-foreground",
                active && "text-muted-foreground",
              )}
              aria-label={`Shortcut: Command ${tab.shortcut}`}
            >
              ⌘{tab.shortcut}
            </kbd>
          </Link>
        );
      })}
    </nav>
  );
}
