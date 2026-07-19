import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { KnowledgeExtraction } from "@/types/domain";

interface VersionSelectorProps {
  extractions: KnowledgeExtraction[];
  selectedVersion: number | null;
  onSelectedVersionChange: (version: number) => void;
  compareVersion: number | null;
  onCompareVersionChange: (version: number | null) => void;
}

const NONE_VALUE = "__none__";

export function VersionSelector({
  extractions,
  selectedVersion,
  onSelectedVersionChange,
  compareVersion,
  onCompareVersionChange,
}: VersionSelectorProps) {
  const sorted = [...extractions].sort((a, b) => b.version - a.version);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={selectedVersion !== null ? String(selectedVersion) : undefined} onValueChange={(v) => onSelectedVersionChange(Number(v))}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Version" />
        </SelectTrigger>
        <SelectContent>
          {sorted.map((extraction) => (
            <SelectItem key={extraction.version} value={String(extraction.version)}>
              Version {extraction.version}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-xs text-muted-foreground">compare with</span>

      <Select
        value={compareVersion !== null ? String(compareVersion) : NONE_VALUE}
        onValueChange={(v) => onCompareVersionChange(v === NONE_VALUE ? null : Number(v))}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>None</SelectItem>
          {sorted
            .filter((e) => e.version !== selectedVersion)
            .map((extraction) => (
              <SelectItem key={extraction.version} value={String(extraction.version)}>
                Version {extraction.version}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
