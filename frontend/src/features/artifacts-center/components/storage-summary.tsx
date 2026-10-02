import { Database, FileStack, Maximize2, Clock } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { formatBytes, formatRelativeTime } from "@/lib/utils/formatters";
import type { StorageSummaryData } from "@/features/artifacts-center/lib/storage-summary";

interface StorageSummaryProps {
  summary: StorageSummaryData;
}

interface StatProps {
  icon: typeof Database;
  label: string;
  value: React.ReactNode;
  hint?: string;
}

function Stat({ icon: Icon, label, value, hint }: StatProps) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="section-label">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** `storageUsedBytes` only sums artifacts with a known size - the backend doesn't report per-file sizes for JSON exports or execution manifests, so this is a real (if partial) figure, not an estimate. */
export function StorageSummary({ summary }: StorageSummaryProps) {
  return (
    <SectionCard title="Storage summary">
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={FileStack} label="Total artifacts" value={summary.totalArtifacts} />
        <Stat
          icon={Database}
          label="Storage used"
          value={formatBytes(summary.storageUsedBytes)}
          hint={summary.sizedArtifactCount < summary.totalArtifacts ? `${summary.sizedArtifactCount} of ${summary.totalArtifacts} sized` : undefined}
        />
        <Stat
          icon={Clock}
          label="Latest artifact"
          value={summary.latest ? summary.latest.fileName : "—"}
          hint={summary.latest ? formatRelativeTime(summary.latest.createdAt) : undefined}
        />
        <Stat
          icon={Maximize2}
          label="Largest artifact"
          value={summary.largest ? summary.largest.fileName : "—"}
          hint={summary.largest?.sizeBytes !== null && summary.largest?.sizeBytes !== undefined ? formatBytes(summary.largest.sizeBytes) : undefined}
        />
      </div>
    </SectionCard>
  );
}
