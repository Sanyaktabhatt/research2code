import type { FileTreeFolder, FileTreeNode } from "@/features/generated-project/types";

/** Keeps only files whose name/path matches `query`, plus the folders needed to reach them. Empty query returns the tree unchanged. */
export function filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return nodes;

  const filterNode = (node: FileTreeNode): FileTreeNode | null => {
    if (node.type === "file") {
      return node.path.toLowerCase().includes(needle) ? node : null;
    }
    const children = node.children.map(filterNode).filter((n): n is FileTreeNode => n !== null);
    if (children.length === 0) return null;
    return { ...node, children } satisfies FileTreeFolder;
  };

  return nodes.map(filterNode).filter((n): n is FileTreeNode => n !== null);
}

/** Every folder path in a tree - used to auto-expand all matches while a search filter is active. */
export function allFolderPaths(nodes: FileTreeNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.type === "folder") {
      paths.push(node.path, ...allFolderPaths(node.children));
    }
  }
  return paths;
}
