import type { FileTreeNode } from "@/features/generated-project/types";

export interface VisibleRow {
  node: FileTreeNode;
  depth: number;
}

/** Depth-first list of nodes visible given the current expanded-folder set - the basis for both rendering and roving-tabindex keyboard navigation. */
export function flattenVisible(nodes: FileTreeNode[], expanded: Set<string>, depth = 0): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    if (node.type === "folder" && expanded.has(node.path)) {
      rows.push(...flattenVisible(node.children, expanded, depth + 1));
    }
  }
  return rows;
}
