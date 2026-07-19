"use client";

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
    <div className="flex items-center justify-between gap-4 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        {!isDesktop && (
          <Button variant="ghost" size="icon" onClick={onOpenNav} aria-label="Open project navigation">
            <Menu className="size-4" />
          </Button>
        )}
        <div className="hidden size-7 shrink-0 items-center justify-center rounded-md bg-gradient-brand-soft sm:flex" aria-hidden="true">
          <span className="size-2 rounded-full bg-gradient-brand shadow-glow" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight">{project.name}</h1>
            <StageBadge status={projectStatusToStage(project.status)} label={project.status} />
          </div>
          <p className="text-xs text-muted-foreground">{activeTabLabel}</p>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onToggleInspector}>
        {inspectorOpen ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
        Inspector
      </Button>
    </div>
  );
}
