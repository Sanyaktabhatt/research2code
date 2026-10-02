"use client";

import Link from "next/link";
import { Menu, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageBadge } from "@/components/ui/stage-badge";
import { projectStatusToStage } from "@/lib/utils/status-mapping";
import type { Project } from "@/types/domain";

interface WorkspaceHeaderProps {
  project: Project;
  activeTabLabel: string;
  isDesktop: boolean;
  inspectorOpen: boolean;
  onOpenNav: () => void;
  onToggleInspector: () => void;
}

export function WorkspaceHeader({
  project,
  activeTabLabel,
  isDesktop,
  inspectorOpen,
  onOpenNav,
  onToggleInspector,
}: WorkspaceHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {!isDesktop && (
          <Button variant="ghost" size="icon" onClick={onOpenNav} aria-label="Open project navigation">
            <Menu className="size-4" />
          </Button>
        )}
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="truncate text-xs text-muted-foreground">
            <Link href="/projects" className="text-info underline-offset-2 hover:underline">
              Projects
            </Link>
            <span className="px-1 text-muted-foreground/60">/</span>
            {project.name}
          </nav>
          <div className="mt-0.5 flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold leading-tight tracking-tight">{activeTabLabel}</h1>
            <StageBadge status={projectStatusToStage(project.status)} label={project.status} />
          </div>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onToggleInspector}>
        {inspectorOpen ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
        Inspector
      </Button>
    </div>
  );
}
