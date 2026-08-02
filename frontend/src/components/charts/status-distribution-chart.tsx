"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
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

/**
 * Recharts' default tooltip (a raw `${name} : ${value}` line in a
 * bare-bones bordered box) doesn't match this app's actual tooltip look
 * (see components/ui/tooltip.tsx: rounded-md, inverted foreground/background
 * colors, shadow-lg, no border) - this reproduces that same look instead of
 * the generic default, plus renders the count as "N project(s)" and a
 * stage-colored dot rather than a raw label/value pair.
 */
function ChartTooltipContent({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload as StatusDistributionDatum | undefined;
  if (!datum) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: `hsl(${STAGE_COLOR_VAR[datum.stage]})` }}
        aria-hidden="true"
      />
      {datum.label}: {datum.count} {datum.count === 1 ? "project" : "projects"}
    </div>
  );
}

// Recharts gives each category an equal share of the container height, so a
// fixed height regardless of `data.length` looks fine with 4 categories but
// leaves a single bar stranded in a mostly-empty box when there's only 1-2 -
// scaling per row keeps bar thickness/spacing consistent either way.
const ROW_HEIGHT = 56;
const CHART_PADDING = 24;
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 220;

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  const height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, data.length * ROW_HEIGHT + CHART_PADDING));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
        <XAxis
          type="number"
          allowDecimals={false}
          // Recharts' default domain pads small integer maxes out to a
          // rounder number (e.g. a single count of 1 rendering ticks up to
          // 4) to get a "nice" tick count, which for this chart's typically
          // small counts left the one real bar looking lost against mostly
          // dead axis space. Domain 'dataMax' stops exactly at the largest
          // count instead.
          domain={[0, "dataMax"]}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
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
          // A single bar (as in the empty/near-empty-project case) spans
          // nearly the full plot width, so hovering near its end anchors
          // the default cursor-following tooltip right at the container's
          // edge. `allowEscapeViewBox: false` (recharts' default, made
          // explicit here) clamps it back inside the plot area instead of
          // letting it render flush against - or past - the boundary.
          allowEscapeViewBox={{ x: false, y: false }}
          content={<ChartTooltipContent />}
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
