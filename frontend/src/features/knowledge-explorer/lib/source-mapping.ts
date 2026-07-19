import { findSectionForPage } from "@/features/paper-viewer/lib/derive-outline";
import { SECTION_LABELS, type ParsedSection, type PageContent } from "@/features/paper-viewer/types";
import type { EntitySource, NormalizedEntity } from "@/features/knowledge-explorer/types";

const SNIPPET_RADIUS = 70;

/**
 * The knowledge extraction is paper-wide - no entity is tagged with the
 * section/page it came from. As a real (not fabricated) proxy, this
 * searches the paper's actual page text for the entity's identifying term
 * and reports the first page/section it literally appears in. When nothing
 * matches (an inferred value, e.g. loosely-worded metrics), source fields
 * come back null rather than a guessed value.
 */
export function deriveEntitySource(entity: NormalizedEntity, pages: PageContent[], sections: ParsedSection[]): EntitySource {
  const needle = entity.searchTerm.trim().toLowerCase();
  if (needle.length < 2) {
    return { sectionName: null, sectionLabel: null, pageNumber: null, citation: null };
  }

  for (const page of pages) {
    const haystack = page.text.toLowerCase();
    const index = haystack.indexOf(needle);
    if (index === -1) continue;

    const start = Math.max(0, index - SNIPPET_RADIUS);
    const end = Math.min(page.text.length, index + needle.length + SNIPPET_RADIUS);
    const citation = `${start > 0 ? "…" : ""}${page.text.slice(start, end).trim()}${end < page.text.length ? "…" : ""}`;

    const section = findSectionForPage(sections, page.page_number);

    return {
      sectionName: section?.name ?? null,
      sectionLabel: section ? (SECTION_LABELS[section.name as keyof typeof SECTION_LABELS] ?? section.name) : null,
      pageNumber: page.page_number,
      citation,
    };
  }

  return { sectionName: null, sectionLabel: null, pageNumber: null, citation: null };
}
