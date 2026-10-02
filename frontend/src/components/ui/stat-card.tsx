"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils/cn";
import { hoverLift } from "@/lib/motion";

/**
 * Muted per-metric icon accents: a faint tint behind an accent-colored
 * glyph, tuned separately for the light and dark surfaces. Omitting
 * `accent` keeps the neutral treatment.
 */
const ACCENT_CLASSES = {
  neutral: "border border-border bg-muted text-foreground/70",
  blue: "bg-[hsl(211_70%_46%/0.1)] text-[hsl(211_68%_42%)] dark:bg-[hsl(211_80%_62%/0.12)] dark:text-[hsl(211_80%_68%)]",
  cyan: "bg-[hsl(189_70%_38%/0.1)] text-[hsl(189_72%_32%)] dark:bg-[hsl(189_60%_55%/0.12)] dark:text-[hsl(189_58%_60%)]",
  violet: "bg-[hsl(258_40%_55%/0.1)] text-[hsl(258_38%_50%)] dark:bg-[hsl(258_55%_70%/0.12)] dark:text-[hsl(258_60%_76%)]",
  orange: "bg-primary/10 text-[hsl(21_85%_42%)] dark:bg-primary/[0.12] dark:text-[hsl(24_88%_62%)]",
  // Semantic status accents, built on the app's status tokens.
  success: "bg-success/10 text-success dark:bg-success/[0.12]",
  info: "bg-info/10 text-info dark:bg-info/[0.12]",
  destructive: "bg-destructive/10 text-destructive dark:bg-destructive/[0.12]",
  muted: "bg-muted text-muted-foreground",
} as const;

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  accent?: keyof typeof ACCENT_CLASSES;
  trend?: { value: number; direction: "up" | "down"; isPositive?: boolean };
  className?: string;
}

export function StatCard({ label, value, icon: Icon, accent = "neutral", trend, className }: StatCardProps) {
  return (
    <motion.div {...hoverLift}>
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
          <CardTitle className="text-[13px] font-medium text-muted-foreground">{label}</CardTitle>
          {Icon && (
            <div className={cn("flex size-8 items-center justify-center rounded-xl", ACCENT_CLASSES[accent])} aria-hidden="true">
              <Icon className="size-4" strokeWidth={1.75} />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-[1.625rem] font-semibold leading-tight tracking-tight tabular-nums text-foreground">
            {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
          </div>
          {trend && (
            <p
              className={cn(
                "mt-1.5 flex items-center gap-1 text-xs font-medium",
                trend.isPositive ?? trend.direction === "up" ? "text-success" : "text-destructive",
              )}
            >
              {trend.direction === "up" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
              {trend.value}%
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
