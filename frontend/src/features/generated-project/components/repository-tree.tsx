"use client";

import * as React from "react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { ChevronsDownUp, ChevronsUpDown, FileX } from "lucide-react";
import { useRepositoryTreeStore } from "@/features/generated-project/stores/use-repository-tree-store";
import { RepositoryNode } from "@/features/generated-project/components/repository-node";
import { RepositorySearch } from "@/features/generated-project/components/repository-search";
import { flattenVisible } from "@/features/generated-project/lib/flatten-visible";
import { allFolderPaths, filterTree } from "@/features/generated-project/lib/filter-tree";
import type { FileTreeNode } from "@/features/generated-project/types";

const EMPTY_EXPANDED: string[] = [];

interface RepositoryTreeProps {
  tree: FileTreeNode[];
  generatedProjectId: string;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

/** Collapsible file/folder tree with search, remembered expanded state (per generated-project id), and roving-tabindex keyboard navigation. */
export function RepositoryTree({ tree, generatedProjectId, selectedPath, onSelectFile }: RepositoryTreeProps) {
  const [search, setSearch] = React.useState("");
  const expandedList = useRepositoryTreeStore((s) => s.expandedByProject[generatedProjectId] ?? EMPTY_EXPANDED);
  const toggleFolder = useRepositoryTreeStore((s) => s.toggleFolder);
  const setExpanded = useRepositoryTreeStore((s) => s.setExpanded);

  const filteredTree = React.useMemo(() => filterTree(tree, search), [tree, search]);
  const isSearching = search.trim().length > 0;

  const expandedSet = React.useMemo(() => {
    if (isSearching) return new Set(allFolderPaths(filteredTree));
    return new Set(expandedList);
  }, [isSearching, filteredTree, expandedList]);

  const rows = React.useMemo(() => flattenVisible(filteredTree, expandedSet), [filteredTree, expandedSet]);

  const [focusedPath, setFocusedPath] = React.useState<string | null>(null);
  const rowRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const focusIndex = rows.findIndex((r) => r.node.path === focusedPath);
  const activePath = focusIndex >= 0 ? focusedPath : (rows[0]?.node.path ?? null);

  const focusRow = (path: string) => {
    setFocusedPath(path);
    rowRefs.current.get(path)?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = rows.findIndex((r) => r.node.path === activePath);
    if (index === -1) return;
    const row = rows[index]!;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = rows[Math.min(index + 1, rows.length - 1)];
      if (next) focusRow(next.node.path);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = rows[Math.max(index - 1, 0)];
      if (prev) focusRow(prev.node.path);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (row.node.type === "folder") {
        if (!expandedSet.has(row.node.path)) toggleFolder(generatedProjectId, row.node.path);
        else {
          const next = rows[index + 1];
          if (next) focusRow(next.node.path);
        }
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (row.node.type === "folder" && expandedSet.has(row.node.path)) {
        toggleFolder(generatedProjectId, row.node.path);
      } else {
        const parentPath = row.node.path.split("/").slice(0, -1).join("/");
        const parent = rows.find((r) => r.node.path === parentPath);
        if (parent) focusRow(parent.node.path);
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (row.node.type === "folder") toggleFolder(generatedProjectId, row.node.path);
      else onSelectFile(row.node.path);
    }
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <RepositorySearch value={search} onChange={setSearch} />
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => setExpanded(generatedProjectId, allFolderPaths(tree))}
          aria-label="Expand all folders"
        >
          <ChevronsUpDown className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => setExpanded(generatedProjectId, [])}
          aria-label="Collapse all folders"
        >
          <ChevronsDownUp className="size-3.5" />
        </Button>
      </div>
      <div role="tree" aria-label="Generated project files" className="min-h-0 flex-1 overflow-y-auto" onKeyDown={handleKeyDown}>
        {rows.length === 0 ? (
          <EmptyState icon={FileX} title="No files match" description="Try a different search term." className="p-4" />
        ) : (
          rows.map(({ node, depth }) => (
            <RepositoryNode
              key={node.path}
              ref={(el) => {
                if (el) rowRefs.current.set(node.path, el);
                else rowRefs.current.delete(node.path);
              }}
              node={node}
              depth={depth}
              isExpanded={node.type === "folder" && expandedSet.has(node.path)}
              isSelected={node.path === selectedPath}
              dimmed={false}
              tabIndex={node.path === activePath ? 0 : -1}
              onFocus={() => setFocusedPath(node.path)}
              onToggleFolder={() => toggleFolder(generatedProjectId, node.path)}
              onSelectFile={() => {
                onSelectFile(node.path);
                setFocusedPath(node.path);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
