"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils/cn";
import { hoverLift } from "@/lib/motion";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: number; direction: "up" | "down"; isPositive?: boolean };
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <motion.div {...hoverLift}>
      <Card className={cn("group glow-hover overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
          {Icon && (
            <div className="flex size-7 items-center justify-center rounded-md bg-gradient-brand-soft text-primary transition-transform duration-200 group-hover:scale-110">
              <Icon className="size-3.5" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-[1.75rem] font-semibold leading-tight tracking-tight tabular-nums">
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
