import type { Root } from "mdast";

const CITATION_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

interface TextNode {
  type: "text";
  value: string;
}

interface CitationRefNode {
  type: "citationRef";
  data: { hName: string; hProperties: { "data-indices": string } };
  children: [];
}

function splitTextValue(value: string): (TextNode | CitationRefNode)[] {
  const pieces: (TextNode | CitationRefNode)[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(CITATION_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) pieces.push({ type: "text", value: value.slice(lastIndex, start) });
    const indices = match[1]!.split(",").map((s) => s.trim()).join(",");
    pieces.push({
      type: "citationRef",
      data: { hName: "citation-ref", hProperties: { "data-indices": indices } },
      children: [],
    });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < value.length) pieces.push({ type: "text", value: value.slice(lastIndex) });
  return pieces;
}

/**
 * Turns inline `[1]` / `[2, 3]` citation markers - the exact format the
 * backend's SYSTEM_PROMPT instructs the model to emit (see
 * backend/app/agents/rag_prompts.py) - into clickable `<citation-ref>`
 * elements react-markdown renders via `components["citation-ref"]`.
 *
 * Walks any node with a `children` array; `code`/`inlineCode` nodes store
 * their text as `value` rather than child text nodes, so they're skipped
 * automatically without special-casing.
 */
export function remarkCitations() {
  return (tree: Root) => {
    walk(tree as unknown as ParentLike);
  };
}

interface ParentLike {
  type: string;
  children?: unknown[];
}

function walk(node: ParentLike): void {
  if (!Array.isArray(node.children)) return;

  const nextChildren: unknown[] = [];
  for (const child of node.children as ParentLike[]) {
    if (child.type === "text") {
      const split = splitTextValue((child as unknown as TextNode).value);
      if (split.length === 1 && split[0]!.type === "text") {
        nextChildren.push(child);
      } else {
        nextChildren.push(...split);
      }
    } else {
      walk(child);
      nextChildren.push(child);
    }
  }
  node.children = nextChildren;
}
