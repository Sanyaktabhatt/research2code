import type { FileTreeNode } from "@/features/generated-project/types";

/** Renders the tree as an indented ASCII listing, for "Copy repository tree". */
export function formatTreeAsText(nodes: FileTreeNode[], prefix = ""): string {
  const lines: string[] = [];
  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1;
    const connector = isLast ? "└── " : "├── ";
    lines.push(`${prefix}${connector}${node.name}${node.type === "folder" ? "/" : ""}`);
    if (node.type === "folder") {
      const childPrefix = prefix + (isLast ? "    " : "│   ");
      lines.push(formatTreeAsText(node.children, childPrefix));
    }
  });
  return lines.filter(Boolean).join("\n");
}
