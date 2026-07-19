"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { truncate } from "@/lib/utils/formatters";
import type { OutlineEntry } from "@/features/paper-viewer/lib/derive-outline";

interface SectionTreeProps {
  entries: OutlineEntry[];
  activeName: string | null;
  onSelect: (entry: OutlineEntry) => void;
}

export function SectionTree({ entries, activeName, onSelect }: SectionTreeProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const toggleExpanded = (name: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <ul className="space-y-0.5">
      {entries.map((entry) => {
        const isExpanded = expanded.has(entry.name);
        const isActive = entry.name === activeName;
        return (
          <li key={entry.name}>
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50",
                isActive && "bg-accent text-accent-foreground",
              )}
            >
              <ChevronRight
                onClick={(e) => toggleExpanded(entry.name, e)}
                className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-90")}
              />
              <span className="min-w-0 flex-1 truncate font-medium">{entry.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {entry.section.start_page ?? "?"}
                {entry.section.end_page && entry.section.end_page !== entry.section.start_page
                  ? `–${entry.section.end_page}`
                  : ""}
              </span>
            </button>
            {isExpanded && (
              <p className="ml-5 mr-2 mt-1 mb-2 text-xs text-muted-foreground">
                {truncate(entry.section.text.trim(), 180)}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
