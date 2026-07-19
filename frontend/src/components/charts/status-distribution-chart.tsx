"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PipelineStageStatus } from "@/types/domain";

const STAGE_COLOR_VAR: Record<PipelineStageStatus, string> = {
  pending: "var(--stage-pending)",
  running: "var(--stage-running)",
  success: "var(--stage-success)",
  error: "var(--stage-error)",
};

export interface StatusDistributionDatum {
  label: string;
  count: number;
  stage: PipelineStageStatus;
}

interface StatusDistributionChartProps {
  data: StatusDistributionDatum[];
}

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={90}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={`hsl(${STAGE_COLOR_VAR[entry.stage]})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
