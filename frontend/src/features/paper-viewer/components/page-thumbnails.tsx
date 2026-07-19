"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils/cn";
import { truncate } from "@/lib/utils/formatters";
import type { PageContent } from "@/features/paper-viewer/types";

interface PageThumbnailsProps {
  pages: PageContent[];
  currentPage: number;
  onSelectPage: (pageNumber: number) => void;
}

const THUMB_HEIGHT = 96;

export function PageThumbnails({ pages, currentPage, onSelectPage }: PageThumbnailsProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: pages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => THUMB_HEIGHT,
    overscan: 8,
  });

  return (
    <div ref={parentRef} className="w-24 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-2">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const page = pages[virtualItem.index]!;
          const isActive = page.page_number === currentPage;
          return (
            <button
              key={page.page_number}
              type="button"
              onClick={() => onSelectPage(page.page_number)}
              data-index={virtualItem.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
                height: THUMB_HEIGHT,
              }}
              className="px-1 py-1"
            >
              <span
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-1 rounded border bg-background p-1 text-center",
                  isActive ? "border-primary ring-1 ring-primary" : "border-border",
                )}
              >
                <span className="line-clamp-3 text-[9px] leading-tight text-muted-foreground">
                  {truncate(page.text.trim(), 60) || "(empty page)"}
                </span>
                <span className="text-[10px] font-medium">{page.page_number}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
