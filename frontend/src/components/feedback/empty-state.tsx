"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { fadeInUp } from "@/lib/motion";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Shared empty state: a neutral icon well on a dashed, low-contrast
 * surface, with a quick fade-in. Kept content-neutral - no illustration
 * assumes what's missing, since this one component covers ~30 different
 * "nothing here yet" moments across the app.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="show"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong/70 bg-muted/40 px-6 py-8 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="flex size-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-xs" aria-hidden="true">
          <Icon className="size-[18px]" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </motion.div>
  );
}
