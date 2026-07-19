import { findSectionForPage } from "@/features/paper-viewer/lib/derive-outline";
import type { ParsedSection, PageContent } from "@/features/paper-viewer/types";
import type { FlowNode } from "@/features/graph-explorer/types";

const SEARCH_TERM_FIELDS = ["name", "title", "metric_name", "device_type", "description"];

/**
 * Graph nodes carry no page/section pointer (they're Neo4j entities, not
 * paper spans) - same "search the actual page text" proxy used for the
 * knowledge-explorer entity list (see
 * features/knowledge-explorer/lib/source-mapping.ts), so double-clicking a
 * node only jumps into the paper when its name/description literally
 * appears there, never on a fabricated guess.
 */
export function deriveNodeSource(
  node: FlowNode,
  pages: PageContent[],
  sections: ParsedSection[],
): { pageNumber: number; sectionName: string | null } | null {
  let needle = "";
  for (const field of SEARCH_TERM_FIELDS) {
    const value = node.data.properties[field];
    if (typeof value === "string" && value.trim().length >= 2) {
      needle = value.trim().toLowerCase();
      break;
    }
  }
  if (needle.length < 2) return null;

  for (const page of pages) {
    if (!page.text.toLowerCase().includes(needle)) continue;
    const section = findSectionForPage(sections, page.page_number);
    return { pageNumber: page.page_number, sectionName: section?.name ?? null };
  }
  return null;
}
