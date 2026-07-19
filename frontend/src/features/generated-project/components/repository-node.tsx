import * as React from "react";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { languageInfoForPath } from "@/features/generated-project/lib/file-language";
import type { FileTreeNode } from "@/features/generated-project/types";

interface RepositoryNodeProps {
  node: FileTreeNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  dimmed: boolean;
  tabIndex: number;
  onToggleFolder: () => void;
  onSelectFile: () => void;
  onFocus: () => void;
}

export const RepositoryNode = React.forwardRef<HTMLButtonElement, RepositoryNodeProps>(function RepositoryNode(
  { node, depth, isExpanded, isSelected, dimmed, tabIndex, onToggleFolder, onSelectFile, onFocus },
  ref,
) {
  const isFolder = node.type === "folder";
  const Icon = isFolder ? (isExpanded ? FolderOpen : Folder) : languageInfoForPath(node.path).icon;

  return (
    <button
      ref={ref}
      type="button"
      role="treeitem"
      aria-expanded={isFolder ? isExpanded : undefined}
      aria-selected={isSelected}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onClick={isFolder ? onToggleFolder : onSelectFile}
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
      className={cn(
        "relative flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-xs outline-none transition-colors",
        "hover:bg-muted/60 focus-visible:bg-accent focus-visible:text-accent-foreground",
        isSelected && "bg-gradient-brand-soft font-medium text-accent-foreground",
        dimmed && "opacity-40",
      )}
    >
      {isSelected && <span className="absolute inset-y-0.5 left-0 w-0.5 rounded-full bg-gradient-brand" aria-hidden="true" />}
      {isFolder ? (
        <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
      <Icon className={cn("size-3.5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
      <span className="truncate">{node.name}</span>
    </button>
  );
});
