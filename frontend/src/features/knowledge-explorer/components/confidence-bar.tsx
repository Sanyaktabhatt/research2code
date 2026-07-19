import { cn } from "@/lib/utils/cn";

interface ConfidenceBarProps {
  confidence: number;
  className?: string;
}

function colorClassFor(confidence: number): string {
  if (confidence >= 0.8) return "bg-success";
  if (confidence >= 0.5) return "bg-warning";
  return "bg-destructive";
}

export function ConfidenceBar({ confidence, className }: ConfidenceBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, confidence)) * 100);

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cn("h-full rounded-full transition-all", colorClassFor(confidence))} style={{ width: `${percent}%` }} />
    </div>
  );
}
