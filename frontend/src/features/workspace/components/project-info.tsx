import { StageBadge } from "@/components/ui/stage-badge";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { projectStatusToStage } from "@/lib/utils/status-mapping";
import type { Project } from "@/types/domain";

export function ProjectInfo({ project }: { project: Project }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <h2 className="truncate text-[13px] font-semibold tracking-tight">{project.name}</h2>
        <StageBadge status={projectStatusToStage(project.status)} label={project.status} />
      </div>
      {project.description && <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{project.description}</p>}
      <p className="text-xs text-muted-foreground/70">Updated {formatRelativeTime(project.updated_at)}</p>
    </div>
  );
}
