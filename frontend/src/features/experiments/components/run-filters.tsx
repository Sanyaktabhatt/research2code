"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DEFAULT_RUN_FILTERS, type RunFilterState } from "@/features/experiments/types";
import type { ExecutionDevice, ExecutionRunStatus } from "@/types/domain";

const STATUSES: ExecutionRunStatus[] = ["queued", "running", "completed", "failed", "cancelled"];
const DEVICES: ExecutionDevice[] = ["cpu", "gpu"];

interface RunFiltersProps {
  filters: RunFilterState;
  onChange: (filters: RunFilterState) => void;
}

export function RunFilters({ filters, onChange }: RunFiltersProps) {
  const activeCount = filters.statuses.length + filters.devices.length;

  const toggleStatus = (status: ExecutionRunStatus) => {
    const next = filters.statuses.includes(status) ? filters.statuses.filter((s) => s !== status) : [...filters.statuses, status];
    onChange({ ...filters, statuses: next });
  };

  const toggleDevice = (device: ExecutionDevice) => {
    const next = filters.devices.includes(device) ? filters.devices.filter((d) => d !== device) : [...filters.devices, device];
    onChange({ ...filters, devices: next });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="size-4" />
          Filters
          {activeCount > 0 && <span className="rounded-sm bg-info px-1.5 text-[11px] font-semibold text-info-foreground">{activeCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-4">
        <div>
          <Label className="mb-2 block">Status</Label>
          <div className="space-y-1.5">
            {STATUSES.map((status) => (
              <label key={status} className="flex items-center gap-2 text-sm capitalize">
                <Checkbox checked={filters.statuses.includes(status)} onCheckedChange={() => toggleStatus(status)} />
                {status}
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Hardware</Label>
          <div className="space-y-1.5">
            {DEVICES.map((device) => (
              <label key={device} className="flex items-center gap-2 text-sm uppercase">
                <Checkbox checked={filters.devices.includes(device)} onCheckedChange={() => toggleDevice(device)} />
                {device}
              </label>
            ))}
          </div>
        </div>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange({ ...DEFAULT_RUN_FILTERS, search: filters.search })}>
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
