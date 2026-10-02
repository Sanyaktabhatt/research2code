import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils/cn";
import type { GenerationSummaryData } from "@/features/generated-project/lib/generation-summary";

interface GenerationSummaryProps {
  summary: GenerationSummaryData;
}

interface SummaryFieldProps {
  label: string;
  value: React.ReactNode;
}

function SummaryField({ label, value }: SummaryFieldProps) {
  return (
    <div>
      <p className="section-label">{label}</p>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}

function CapabilityFlag({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className={cn("flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs", enabled ? "border-success/30 bg-success/10" : "border-border text-muted-foreground")}>
      {enabled ? <Check className="size-3.5 text-success" /> : <X className="size-3.5" />}
      {label}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">Not detected</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="secondary">
          {item}
        </Badge>
      ))}
    </div>
  );
}

export function GenerationSummary({ summary }: GenerationSummaryProps) {
  return (
    <SectionCard title="Generation summary" description="What the generator detected and configured for this project">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <SummaryField label="Framework" value={<Badge>{summary.framework}</Badge>} />
          <SummaryField label="Dataset" value={<TagList items={summary.datasets} />} />
          <SummaryField label="Optimizer" value={summary.optimizer ?? <span className="text-muted-foreground">Not detected</span>} />
          <SummaryField label="Scheduler" value={summary.scheduler ?? <span className="text-muted-foreground">Not detected</span>} />
          <SummaryField label="Loss function" value={<TagList items={summary.lossFunctions} />} />
          <SummaryField label="Metrics" value={<TagList items={summary.metrics} />} />
        </div>

        <div>
          <p className="mb-2 section-label">Training capabilities</p>
          <div className="grid grid-cols-2 gap-2">
            <CapabilityFlag label="Mixed precision" enabled={summary.mixedPrecision} />
            <CapabilityFlag label="Distributed training" enabled={summary.distributedTraining} />
            <CapabilityFlag label="Checkpointing" enabled={summary.checkpointing} />
            <CapabilityFlag label="TensorBoard" enabled={summary.tensorboard} />
            <CapabilityFlag label="MLflow" enabled={summary.mlflow} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
