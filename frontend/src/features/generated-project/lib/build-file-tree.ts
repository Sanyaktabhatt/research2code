import type { FileTreeFolder, FileTreeNode } from "@/features/generated-project/types";

/** `file_manifest` is a flat list of relative paths (see backend/app/codegen/exporters.py::ZipExporter - archive entries are `file.path` verbatim, no root wrapper folder) - this nests it into folders/files for the tree view. */
export function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeFolder = { type: "folder", name: "", path: "", children: [] };

  for (const path of [...paths].sort()) {
    const segments = path.split("/");
    let current = root;

    segments.forEach((segment, index) => {
      const isFile = index === segments.length - 1;
      const segmentPath = segments.slice(0, index + 1).join("/");

      if (isFile) {
        current.children.push({ type: "file", name: segment, path: segmentPath });
        return;
      }

      let folder = current.children.find((c): c is FileTreeFolder => c.type === "folder" && c.name === segment);
      if (!folder) {
        folder = { type: "folder", name: segment, path: segmentPath, children: [] };
        current.children.push(folder);
      }
      current = folder;
    });
  }

  sortTree(root.children);
  return root.children;
}

function sortTree(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.type === "folder") sortTree(node.children);
  }
}

export function flattenFilePaths(nodes: FileTreeNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.type === "file") paths.push(node.path);
    else paths.push(...flattenFilePaths(node.children));
  }
  return paths;
}

/** All ancestor folder paths of `filePath`, e.g. "callbacks/checkpoint.py" -> ["callbacks"]. */
export function ancestorFolderPaths(filePath: string): string[] {
  const segments = filePath.split("/").slice(0, -1);
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
}
