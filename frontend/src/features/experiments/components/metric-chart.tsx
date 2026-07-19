"use client";

import * as React from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "@/components/ui/section-card";

export interface MetricChartPoint {
  x: number;
  y: number;
}

interface MetricChartProps {
  title: string;
  data: MetricChartPoint[];
  colorVar: string;
  unit?: string;
  formatY?: (value: number) => string;
}

/** One metric's time series as a Recharts line chart - a thin, reusable shell so MetricsPanel/ResourceUsagePanel only decide *which* metrics exist, never how to draw one. */
export const MetricChart = React.memo(function MetricChart({ title, data, colorVar, unit, formatY }: MetricChartProps) {
  const yFormatter = formatY ?? ((v: number) => `${Math.round(v * 10) / 10}${unit ?? ""}`);

  return (
    <SectionCard title={title}>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
          <XAxis dataKey="x" tick={false} axisLine={false} tickLine={false} />
          <YAxis
            width={44}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={yFormatter}
          />
          <Tooltip
            labelFormatter={() => ""}
            formatter={(value: number) => [yFormatter(value), title]}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
              fontSize: 12,
              color: "hsl(var(--popover-foreground))",
            }}
          />
          <Line type="monotone" dataKey="y" stroke={`hsl(${colorVar})`} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
  );
});
