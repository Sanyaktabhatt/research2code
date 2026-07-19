import type { PageContent } from "@/features/paper-viewer/types";

export interface SearchMatch {
  id: string;
  pageNumber: number;
  snippet: string;
  matchStart: number;
  matchEnd: number;
}

const SNIPPET_RADIUS = 60;

/** Case-insensitive substring search across every page's real extracted text. */
export function searchPages(pages: PageContent[], query: string): SearchMatch[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const needle = trimmed.toLowerCase();
  const matches: SearchMatch[] = [];

  for (const page of pages) {
    const haystack = page.text.toLowerCase();
    let fromIndex = 0;

    while (true) {
      const index = haystack.indexOf(needle, fromIndex);
      if (index === -1) break;

      const start = Math.max(0, index - SNIPPET_RADIUS);
      const end = Math.min(page.text.length, index + needle.length + SNIPPET_RADIUS);
      const snippet = `${start > 0 ? "…" : ""}${page.text.slice(start, end).trim()}${end < page.text.length ? "…" : ""}`;

      matches.push({
        id: `${page.page_number}-${index}`,
        pageNumber: page.page_number,
        snippet,
        matchStart: index - start + (start > 0 ? 1 : 0),
        matchEnd: index - start + (start > 0 ? 1 : 0) + needle.length,
      });

      fromIndex = index + needle.length;
    }
  }

  return matches;
}
