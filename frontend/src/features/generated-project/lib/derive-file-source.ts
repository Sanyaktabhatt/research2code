import { findSectionForPage } from "@/features/paper-viewer/lib/derive-outline";
import type { ParsedSection, PageContent } from "@/features/paper-viewer/types";

/**
 * A generated file has no page pointer of its own - same "search the
 * paper's actual text for the related entity's name" proxy graph-explorer
 * and knowledge-explorer both use, so this only reports a section when the
 * entity name literally appears there, never a fabricated guess.
 */
export function deriveFileSection(entityNames: string[], pages: PageContent[], sections: ParsedSection[]): string | null {
  for (const name of entityNames) {
    const needle = name.trim().toLowerCase();
    if (needle.length < 2) continue;

    for (const page of pages) {
      if (!page.text.toLowerCase().includes(needle)) continue;
      const section = findSectionForPage(sections, page.page_number);
      if (section) return section.name;
    }
  }
  return null;
}
