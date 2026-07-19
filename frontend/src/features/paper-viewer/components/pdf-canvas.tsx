"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils/cn";
import { PageThumbnails } from "@/features/paper-viewer/components/page-thumbnails";
import { SearchPanel } from "@/features/paper-viewer/components/search-panel";
import { ViewerToolbar } from "@/features/paper-viewer/components/viewer-toolbar";
import type { SearchMatch } from "@/features/paper-viewer/lib/search-pages";
import type { FitMode, PageContent } from "@/features/paper-viewer/types";

interface HighlightRange {
  start: number;
  end: number;
}

interface PDFCanvasProps {
  pages: PageContent[];
  currentPage: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  rotation: number;
  onRotate: () => void;
  fitMode: FitMode;
  onFitModeChange: (mode: FitMode) => void;
  highlightRange: HighlightRange | null;
  flashPage: number | null;
  searchOpen: boolean;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  matches: SearchMatch[];
  activeMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onSelectMatch: (match: SearchMatch) => void;
}

const PAGE_BASE_WIDTH = 680;
const ESTIMATED_PAGE_HEIGHT = 880;

export interface PDFCanvasHandle {
  toggleFullscreen: () => void;
}

export const PDFCanvas = React.forwardRef<PDFCanvasHandle, PDFCanvasProps>(function PDFCanvas({
  pages,
  currentPage,
  onPageChange,
  zoom,
  onZoomIn,
  onZoomOut,
  rotation,
  onRotate,
  fitMode,
  onFitModeChange,
  highlightRange,
  flashPage,
  searchOpen,
  onOpenSearch,
  onCloseSearch,
  searchQuery,
  onSearchQueryChange,
  matches,
  activeMatchIndex,
  onNextMatch,
  onPrevMatch,
  onSelectMatch,
}, ref) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const lastReportedPage = React.useRef(currentPage);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const scale = zoom / 100;

  const virtualizer = useVirtualizer({
    count: pages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_PAGE_HEIGHT * scale + 24,
    overscan: 2,
  });

  // Guards against handleScroll racing an imperative scrollToIndex: react-virtual's
  // dynamic size measurement settles over a couple of frames, so the *first*
  // scroll event right after jumping can still report the previous page.
  const suppressScrollSyncUntil = React.useRef(0);

  // External page-change (outline/figure/table/equation click, thumbnail, toolbar nav) scrolls to it.
  React.useEffect(() => {
    if (currentPage === lastReportedPage.current) return;
    const index = pages.findIndex((p) => p.page_number === currentPage);
    if (index >= 0) {
      suppressScrollSyncUntil.current = Date.now() + 500;
      virtualizer.scrollToIndex(index, { align: "start" });
      lastReportedPage.current = currentPage;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Scrolling manually updates the reported current page (throttled to the topmost visible item).
  const handleScroll = React.useCallback(() => {
    if (Date.now() < suppressScrollSyncUntil.current) return;
    const items = virtualizer.getVirtualItems();
    const first = items[0];
    if (!first) return;
    const page = pages[first.index]?.page_number;
    if (page !== undefined && page !== lastReportedPage.current) {
      lastReportedPage.current = page;
      onPageChange(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  React.useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  React.useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

  React.useImperativeHandle(ref, () => ({ toggleFullscreen }), []);

  const pageMaxWidth = fitMode === "width" ? "100%" : `${PAGE_BASE_WIDTH}px`;

  return (
    <div ref={containerRef} className="flex h-full flex-col bg-background">
      <ViewerToolbar
        currentPage={currentPage}
        pageCount={pages.length}
        onPageChange={onPageChange}
        zoom={zoom}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        fitMode={fitMode}
        onFitModeChange={onFitModeChange}
        onRotate={onRotate}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenSearch={onOpenSearch}
      />

      <div className="flex min-h-0 flex-1">
        <PageThumbnails pages={pages} currentPage={currentPage} onSelectPage={onPageChange} />

        <div ref={scrollRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto bg-muted/30 p-6">
          {searchOpen && (
            <SearchPanel
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
              matches={matches}
              activeMatchIndex={activeMatchIndex}
              onNext={onNextMatch}
              onPrev={onPrevMatch}
              onSelectMatch={onSelectMatch}
              onClose={onCloseSearch}
              inputRef={searchInputRef}
            />
          )}

          <div
            style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}
            className="mx-auto"
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const page = pages[virtualItem.index]!;
              const isHighlighted =
                highlightRange !== null && page.page_number >= highlightRange.start && page.page_number <= highlightRange.end;
              const isFlashed = flashPage === page.page_number;

              return (
                <div
                  key={page.page_number}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="flex justify-center pb-6"
                >
                  <div
                    style={{
                      width: pageMaxWidth,
                      maxWidth: "100%",
                      transform: `rotate(${rotation}deg)`,
                      fontSize: `${scale}rem`,
                    }}
                    className={cn(
                      "min-h-[200px] rounded-md border bg-background p-8 shadow-sm transition-shadow",
                      isHighlighted && "border-primary ring-2 ring-primary/40",
                      isFlashed && "animate-pulse border-warning ring-2 ring-warning/50",
                      !isHighlighted && !isFlashed && "border-border",
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Page {page.page_number}</span>
                      {page.used_ocr && <span className="rounded bg-muted px-1.5 py-0.5">OCR</span>}
                    </div>
                    <p className="whitespace-pre-wrap font-serif leading-relaxed text-foreground">
                      {page.text || "(No extracted text on this page)"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
