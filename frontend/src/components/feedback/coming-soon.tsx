import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Placeholder for pipeline-stage routes not yet implemented as features. */
export function ComingSoon({ icon, title, description }: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState icon={icon} title={title} description={description} className="max-w-md" />
    </div>
  );
}
