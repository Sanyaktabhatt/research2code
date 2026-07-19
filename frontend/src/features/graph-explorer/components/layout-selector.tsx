import { GitBranch, Share2, Waypoints } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GraphLayoutMode } from "@/stores/graph-view-store";

const LAYOUT_OPTIONS: { value: GraphLayoutMode; label: string; icon: typeof Share2 }[] = [
  { value: "force", label: "Force-directed", icon: Share2 },
  { value: "hierarchical", label: "Hierarchical", icon: GitBranch },
  { value: "radial", label: "Radial", icon: Waypoints },
];

interface LayoutSelectorProps {
  value: GraphLayoutMode;
  onChange: (mode: GraphLayoutMode) => void;
}

export function LayoutSelector({ value, onChange }: LayoutSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as GraphLayoutMode)}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LAYOUT_OPTIONS.map(({ value: v, label, icon: Icon }) => (
          <SelectItem key={v} value={v}>
            <span className="flex items-center gap-2">
              <Icon className="size-3.5" />
              {label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
