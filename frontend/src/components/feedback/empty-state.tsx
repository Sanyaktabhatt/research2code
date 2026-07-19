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
 * Shared empty state: a soft gradient-glow blob behind the icon (in place of
 * a plain gray circle) and a gentle fade-up entrance. Kept content-neutral -
 * no illustration assumes what's missing, since this one component covers
 * ~30 different "nothing here yet" moments across the app.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="show"
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-border bg-gradient-brand-soft p-10 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="relative flex size-14 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full bg-gradient-brand opacity-20 blur-lg animate-float-slow"
            aria-hidden="true"
          />
          <div className="relative flex size-12 items-center justify-center rounded-full border border-border/60 bg-card shadow-sm" aria-hidden="true">
            <Icon className="size-5 text-primary" />
          </div>
        </div>
      )}
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </motion.div>
  );
}
