"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronsLeft, ChevronsRight, LayoutDashboard, LayoutGrid, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BrandMark } from "@/components/brand/brand-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils/cn";

/**
 * Global app rail only (Dashboard/Projects/Settings). Once inside a project,
 * WorkspaceLayout's own left panel owns project-scoped navigation (pipeline
 * tracker + workspace tabs) - duplicating that here would just be the same
 * links rendered twice.
 */
export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "relative flex h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <Link
        href="/dashboard"
        className={cn(
          "flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-3.5 outline-none focus-visible:bg-sidebar-accent/40",
          collapsed && "justify-center px-0",
        )}
      >
        <BrandMark size={24} />
        {!collapsed && <Wordmark />}
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
        <SidebarLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} active={pathname === "/dashboard"} />
        <SidebarLink
          href="/projects"
          icon={LayoutGrid}
          label="Projects"
          collapsed={collapsed}
          active={pathname === "/projects" || pathname?.startsWith("/projects/") === true}
        />
      </nav>

      <div className="space-y-0.5 border-t border-sidebar-border p-2.5">
        <SidebarLink
          href="/settings/account"
          icon={Settings}
          label="Settings"
          collapsed={collapsed}
          active={pathname?.startsWith("/settings") ?? false}
        />
        <Button
          variant="ghost"
          size="icon"
          className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </Button>
      </div>
    </aside>
  );
}

interface SidebarLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  active: boolean;
}

function SidebarLink({ href, icon: Icon, label, collapsed, active }: SidebarLinkProps) {
  const link = (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium text-sidebar-foreground/70 transition-colors duration-150 hover:text-sidebar-foreground",
        active && "text-sidebar-accent-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-pill"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
          className="absolute inset-0 rounded-lg bg-sidebar-accent shadow-sm"
          aria-hidden="true"
        />
      )}
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 z-10 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gradient-brand" aria-hidden="true" />
      )}
      <Icon className="relative z-10 size-[17px] shrink-0 transition-transform duration-150 group-hover:scale-105" />
      {!collapsed && <span className="relative z-10 truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
