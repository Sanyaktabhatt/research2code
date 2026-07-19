import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StageBadge } from "@/components/ui/stage-badge";
import { formatDate } from "@/lib/utils/formatters";
import { generatedProjectStatusToStage } from "@/lib/utils/status-mapping";
import type { GeneratedProject } from "@/types/domain";

interface GenerationSelectorProps {
  versions: GeneratedProject[];
  selectedVersion: number | null;
  onSelectedVersionChange: (version: number) => void;
  compareVersion: number | null;
  onCompareVersionChange: (version: number | null) => void;
}

const NONE_VALUE = "__none__";

/** Switches between generation versions, and picks a second version to diff against - mirrors knowledge-explorer's VersionSelector. */
export function GenerationSelector({
  versions,
  selectedVersion,
  onSelectedVersionChange,
  compareVersion,
  onCompareVersionChange,
}: GenerationSelectorProps) {
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const selected = sorted.find((v) => v.version === selectedVersion);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={selectedVersion !== null ? String(selectedVersion) : undefined} onValueChange={(v) => onSelectedVersionChange(Number(v))}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Version" />
        </SelectTrigger>
        <SelectContent>
          {sorted.map((project) => (
            <SelectItem key={project.version} value={String(project.version)}>
              Version {project.version} · {formatDate(project.created_at)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && <StageBadge status={generatedProjectStatusToStage(selected.status)} label={selected.status} />}

      <span className="text-xs text-muted-foreground">compare with</span>

      <Select
        value={compareVersion !== null ? String(compareVersion) : NONE_VALUE}
        onValueChange={(v) => onCompareVersionChange(v === NONE_VALUE ? null : Number(v))}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>None</SelectItem>
          {sorted
            .filter((v) => v.version !== selectedVersion)
            .map((project) => (
              <SelectItem key={project.version} value={String(project.version)}>
                Version {project.version} · {formatDate(project.created_at)}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
