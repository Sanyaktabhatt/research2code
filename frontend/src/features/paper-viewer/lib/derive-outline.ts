import { SECTION_LABELS, SECTION_NAMES, type ParsedSection } from "@/features/paper-viewer/types";

export interface OutlineEntry {
  name: string;
  label: string;
  section: ParsedSection;
  wordCount: number;
}

/**
 * The backend's section splitter (app/parser/section_extractor.py) only
 * ever produces these 7 names - there is no "conclusion" heading pattern,
 * so a paper's conclusion prose lands inside "results" rather than its own
 * section. The outline lists whichever of the 7 canonical sections this
 * paper's parser actually found, in a fixed reading order - it never shows
 * a section that wasn't really extracted.
 */
export function deriveOutline(sections: ParsedSection[]): OutlineEntry[] {
  const byName = new Map(sections.map((section) => [section.name, section]));

  return SECTION_NAMES.filter((name) => byName.has(name)).map((name) => {
    const section = byName.get(name)!;
    return {
      name,
      label: SECTION_LABELS[name],
      section,
      wordCount: section.text.trim().length === 0 ? 0 : section.text.trim().split(/\s+/).length,
    };
  });
}

export function findSectionForPage(sections: ParsedSection[], pageNumber: number): ParsedSection | null {
  return (
    sections.find(
      (section) =>
        section.start_page !== null &&
        section.end_page !== null &&
        pageNumber >= section.start_page &&
        pageNumber <= section.end_page,
    ) ?? null
  );
}
