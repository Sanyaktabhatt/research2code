import { StageBadge } from "@/components/ui/stage-badge";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { projectStatusToStage } from "@/lib/utils/status-mapping";
import type { Project } from "@/types/domain";

export function ProjectInfo({ project }: { project: Project }) {
  // A description that only repeats the name adds nothing under the heading.
  const description = project.description?.trim();
  const showDescription = Boolean(description) && description!.toLowerCase() !== project.name.trim().toLowerCase();

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 break-words text-[15px] font-semibold leading-6 tracking-tight line-clamp-2" title={project.name}>
          {project.name}
        </h2>
        <StageBadge status={projectStatusToStage(project.status)} label={project.status} />
      </div>
      {showDescription && <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{description}</p>}
      <p className="text-xs text-muted-foreground">Updated {formatRelativeTime(project.updated_at)}</p>
    </div>
  );
}
