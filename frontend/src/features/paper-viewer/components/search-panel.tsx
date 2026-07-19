"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SearchMatch } from "@/features/paper-viewer/lib/search-pages";

interface SearchPanelProps {
  query: string;
  onQueryChange: (query: string) => void;
  matches: SearchMatch[];
  activeMatchIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSelectMatch: (match: SearchMatch) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

/** Floating find-bar overlaying the reading pane, in the spirit of a browser/PDF-reader search box. */
export function SearchPanel({
  query,
  onQueryChange,
  matches,
  activeMatchIndex,
  onNext,
  onPrev,
  onSelectMatch,
  onClose,
  inputRef,
}: SearchPanelProps) {
  return (
    <div className="absolute right-3 top-3 z-20 w-80 rounded-lg border border-border bg-popover p-2 shadow-lg">
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.shiftKey ? onPrev : onNext)();
            if (e.key === "Escape") onClose();
          }}
          placeholder="Search in document…"
          className="h-8"
          autoFocus
        />
        <span className="w-16 shrink-0 text-center text-xs text-muted-foreground">
          {matches.length > 0 ? `${activeMatchIndex + 1}/${matches.length}` : "0/0"}
        </span>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onPrev} disabled={matches.length === 0} aria-label="Previous match">
          <ChevronUp className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onNext} disabled={matches.length === 0} aria-label="Next match">
          <ChevronDown className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onClose} aria-label="Close search">
          <X className="size-4" />
        </Button>
      </div>

      {matches.length > 0 && (
        <ul className="mt-2 max-h-56 overflow-y-auto">
          {matches.map((match, index) => (
            <li key={match.id}>
              <button
                type="button"
                onClick={() => onSelectMatch(match)}
                className={`w-full rounded px-2 py-1 text-left text-xs hover:bg-muted/50 ${
                  index === activeMatchIndex ? "bg-accent" : ""
                }`}
              >
                <span className="font-medium text-muted-foreground">p.{match.pageNumber}</span> {match.snippet}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
