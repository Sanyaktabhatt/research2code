import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { PipelineStageStatus } from "@/types/domain";

const STATUS_CONFIG: Record<PipelineStageStatus, { label: string; variant: "secondary" | "info" | "success" | "destructive"; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", variant: "secondary", icon: CircleDashed },
  running: { label: "Running", variant: "info", icon: Loader2 },
  success: { label: "Success", variant: "success", icon: CheckCircle2 },
  error: { label: "Failed", variant: "destructive", icon: XCircle },
};

interface StageBadgeProps {
  status: PipelineStageStatus;
  label?: string;
  className?: string;
}

export function StageBadge({ status, label, className }: StageBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn("gap-1 font-medium capitalize", className)}>
      <Icon className={cn("size-3", status === "running" && "animate-spin")} aria-hidden="true" />
      {label ?? config.label}
    </Badge>
  );
}
