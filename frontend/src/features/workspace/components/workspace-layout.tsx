"use client";

import * as React from "react";
import { useParams, usePathname } from "next/navigation";
import { FolderX } from "lucide-react";
import { WORKSPACE_TABS } from "@/config/nav";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { EmptyState } from "@/components/feedback/empty-state";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProject } from "@/features/projects/api/use-projects";
import { usePipelineTracker } from "@/features/workspace/api/use-pipeline-tracker";
import { ActivityTimeline } from "@/features/workspace/components/activity-timeline";
import { ContextInspector } from "@/features/workspace/components/context-inspector";
import { PipelineTracker } from "@/features/workspace/components/pipeline-tracker";
import { ProjectInfo } from "@/features/workspace/components/project-info";
import { WorkspaceHeader } from "@/features/workspace/components/workspace-header";
import { WorkspaceTabs } from "@/features/workspace/components/workspace-tabs";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useWorkspacePanelStore } from "@/stores/workspace-panel-store";
import type { Project } from "@/types/domain";
import { cn } from "@/lib/utils/cn";

function isTabActive(pathname: string, projectId: string, segment: string | null): boolean {
  const href = segment ? `/projects/${projectId}/${segment}` : `/projects/${projectId}`;
  return segment ? pathname.startsWith(href) : pathname === href;
}

function LeftPanelContent({ projectId, project }: { projectId: string; project: Project }) {
  const { stages, isLoading } = usePipelineTracker(projectId);

  const completedCount = stages.filter((stage) => stage.status === "success").length;

  return (
    <div>
      <ProjectInfo project={project} />

      <PanelSection title="Workspace">
        <WorkspaceTabs />
      </PanelSection>

      <PanelSection
        title="Processing pipeline"
        meta={!isLoading && stages.length > 0 ? `${completedCount}/${stages.length} complete` : undefined}
      >
        <PipelineTracker stages={stages} isLoading={isLoading} />
      </PanelSection>

      <PanelSection title="Recent activity" flush>
        <ActivityTimeline projectId={projectId} />
      </PanelSection>
    </div>
  );
}

/** One titled block of the left panel, separated from the previous one by a full-width hairline. */
function PanelSection({ title, meta, flush = false, children }: { title: string; meta?: string; flush?: boolean; children: React.ReactNode }) {
  return (
    <section className="-mx-4 mt-4 border-t border-border px-4 pt-4">
      <div className={cn("flex items-baseline justify-between gap-2", flush ? "mb-2" : "mb-3")}>
        <h3 className="section-label">{title}</h3>
        {meta && <span className="text-[11px] tabular-nums text-muted-foreground">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const { data: project, isLoading, isError } = useProject(params.projectId);

  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const inspectorCollapsed = useWorkspacePanelStore((s) => s.inspectorCollapsed);
  const toggleInspector = useWorkspacePanelStore((s) => s.toggleInspector);
  const inspectorWidth = useWorkspacePanelStore((s) => s.inspectorWidth);
  const setInspectorWidth = useWorkspacePanelStore((s) => s.setInspectorWidth);

  const [navSheetOpen, setNavSheetOpen] = React.useState(false);
  const [inspectorSheetOpen, setInspectorSheetOpen] = React.useState(false);
  const isDragging = React.useRef(false);

  React.useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      if (!isDragging.current) return;
      setInspectorWidth(window.innerWidth - event.clientX);
    }
    function onMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.removeProperty("cursor");
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [setInspectorWidth]);

  const activeTab = WORKSPACE_TABS.find((tab) => isTabActive(pathname, params.projectId, tab.segment)) ?? WORKSPACE_TABS[0]!;

  if (isLoading) {
    return (
      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton className="lg:col-span-2" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState icon={FolderX} title="Project not found" description="It may have been deleted, or you don't have access to it." />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      {isDesktop && (
        <aside className="w-72 shrink-0 overflow-y-auto overscroll-contain scroll-smooth border-r border-border bg-card px-4 pb-5 pt-4 scrollbar-thin" aria-label="Project navigation">
          <LeftPanelContent projectId={params.projectId} project={project} />
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <WorkspaceHeader
          project={project}
          activeTabLabel={activeTab.label}
          isDesktop={isDesktop}
          inspectorOpen={isDesktop ? !inspectorCollapsed : inspectorSheetOpen}
          onOpenNav={() => setNavSheetOpen(true)}
          onToggleInspector={() => (isDesktop ? toggleInspector() : setInspectorSheetOpen((open) => !open))}
        />
        <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin sm:p-6">{children}</div>
      </div>

      {isDesktop && !inspectorCollapsed && (
        <div className="relative shrink-0 border-l border-border bg-card" style={{ width: inspectorWidth }}>
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={() => {
              isDragging.current = true;
              document.body.style.cursor = "col-resize";
            }}
            className="absolute left-0 top-0 z-10 h-full w-1.5 -translate-x-1/2 cursor-col-resize transition-colors hover:bg-info/40"
          />
          <div className="h-full overflow-y-auto px-4 py-5 scrollbar-thin">
            <ContextInspector project={project} />
          </div>
        </div>
      )}

      {!isDesktop && (
        <Sheet open={navSheetOpen} onOpenChange={setNavSheetOpen}>
          <SheetContent side="left" className="overflow-y-auto overscroll-contain px-4 scrollbar-thin">
            <SheetHeader>
              <SheetTitle>Project</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <LeftPanelContent projectId={params.projectId} project={project} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {!isDesktop && (
        <Sheet open={inspectorSheetOpen} onOpenChange={setInspectorSheetOpen}>
          <SheetContent side="right" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Inspector</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <ContextInspector project={project} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
