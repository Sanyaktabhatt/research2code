import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

function toneFor(confidence: number): "success" | "warning" | "destructive" {
  if (confidence >= 0.8) return "success";
  if (confidence >= 0.5) return "warning";
  return "destructive";
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  return (
    <Badge variant={toneFor(confidence)} className={cn("font-mono tabular-nums", className)}>
      {Math.round(confidence * 100)}%
    </Badge>
  );
}
