"use client";

import * as React from "react";
import {
  Maximize,
  Minimize,
  Minus,
  Plus,
  RotateCw,
  Search,
  Scan,
  StretchHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FitMode } from "@/features/paper-viewer/types";

interface ViewerToolbarProps {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  fitMode: FitMode;
  onFitModeChange: (mode: FitMode) => void;
  onRotate: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenSearch: () => void;
}

function ToolbarButton({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={active ? "secondary" : "ghost"} size="icon" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ViewerToolbar({
  currentPage,
  pageCount,
  onPageChange,
  zoom,
  onZoomIn,
  onZoomOut,
  fitMode,
  onFitModeChange,
  onRotate,
  isFullscreen,
  onToggleFullscreen,
  onOpenSearch,
}: ViewerToolbarProps) {
  const [pageInput, setPageInput] = React.useState(String(currentPage));

  React.useEffect(() => setPageInput(String(currentPage)), [currentPage]);

  const commitPageInput = () => {
    const page = Number.parseInt(pageInput, 10);
    if (Number.isFinite(page) && page >= 1 && page <= pageCount) {
      onPageChange(page);
    } else {
      setPageInput(String(currentPage));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
      <div className="flex items-center gap-1">
        <ToolbarButton label="Previous page" onClick={() => onPageChange(currentPage - 1)}>
          <span className="text-xs">‹</span>
        </ToolbarButton>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={commitPageInput}
            onKeyDown={(e) => e.key === "Enter" && commitPageInput()}
            className="h-7 w-12 text-center"
            aria-label="Current page"
          />
          <span>/ {pageCount}</span>
        </div>
        <ToolbarButton label="Next page" onClick={() => onPageChange(currentPage + 1)}>
          <span className="text-xs">›</span>
        </ToolbarButton>
      </div>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton label="Zoom out" onClick={onZoomOut}>
        <Minus className="size-4" />
      </ToolbarButton>
      <span className="w-10 text-center text-xs text-muted-foreground">{zoom}%</span>
      <ToolbarButton label="Zoom in" onClick={onZoomIn}>
        <Plus className="size-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton label="Fit width" onClick={() => onFitModeChange("width")} active={fitMode === "width"}>
        <StretchHorizontal className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Fit page" onClick={() => onFitModeChange("page")} active={fitMode === "page"}>
        <Scan className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Rotate" onClick={onRotate}>
        <RotateCw className="size-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton label="Search (Ctrl+F)" onClick={onOpenSearch}>
        <Search className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"} onClick={onToggleFullscreen}>
        {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
      </ToolbarButton>
    </div>
  );
}
