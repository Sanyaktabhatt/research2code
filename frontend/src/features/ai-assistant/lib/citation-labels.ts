import type { Citation, EmbeddingSourceType } from "@/types/domain";

export const SOURCE_TYPE_LABELS: Record<EmbeddingSourceType, string> = {
  section: "Section",
  knowledge_entity: "Knowledge entity",
  figure_caption: "Figure",
  table_description: "Table",
  equation_description: "Equation",
};

/** `source_ref` for a section is `"<id>:<section_name>"` (see context_builder.py::_to_citation); other types keep their raw ref as a readable-enough label. */
export function citationLabel(citation: Citation): string {
  if (citation.section_name) return citation.section_name;
  return citation.source_ref;
}

/**
 * The RAG endpoint returns citation *metadata* only (page/section/score),
 * never the underlying chunk text (see backend/app/schemas/rag.py::Citation)
 * - this formats what's actually available into the Context Inspector's
 * `{sourceRef, content}` preview shape without fabricating chunk content.
 */
export function citationPreview(citation: Citation): string {
  const parts = [SOURCE_TYPE_LABELS[citation.source_type]];
  if (citation.page_number !== null) parts.push(`page ${citation.page_number}`);
  parts.push(`relevance ${Math.round(citation.score * 100)}%`);
  return parts.join(" · ");
}

/** `entity:<category>:<index>` -> "Category #index" - see embedding.py's `source_ref` doc comment. */
export function entityNameFromSourceRef(sourceRef: string): string {
  const [, category, index] = sourceRef.split(":");
  if (!category) return sourceRef;
  const label = category.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return index !== undefined ? `${label} #${index}` : label;
}
