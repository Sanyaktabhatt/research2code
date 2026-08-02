from typing import Any

from app.models.embedding import EmbeddingSourceType
from app.schemas.rag import Citation, ContextResult, RetrievedChunk


def estimate_tokens(text: str) -> int:
    """~4 characters per token: a provider-agnostic heuristic for English text.

    Deliberately not tied to any one vendor's tokenizer, since the LLM layer
    itself is provider-agnostic (see app.agents.llm_provider).
    """
    return max(1, len(text) // 4)


# `token_budget` is a soft target, not a hard ceiling: sections are embedded
# whole (see build_paper_embedding_targets - no sub-chunking), so the single
# best-ranked block can, by itself, already exceed `token_budget` and is
# still always force-included. Once that happens, comparing every later
# block's size against the *remaining* budget (already negative) would
# reject every subsequent block forever, no matter how small - silently
# starving out small, highly relevant chunks (e.g. a 10-token fact) just
# because an oversized chunk happened to rank first. Capping the running
# total against a multiple of the nominal budget instead still bounds prompt
# size, while leaving room for later small chunks to land.
_HARD_CEILING_MULTIPLIER = 2

# No single chunk may claim more than this fraction of the nominal budget.
# Verified empirically: an unchunked ~3.3k-token section ranked first,
# followed by a 10-token knowledge-entity fact that directly answered the
# question, still produced "the context doesn't mention that" from the LLM
# even once both were included - the short, precise fact was there but
# effectively invisible, crowded out by a much longer, mostly-irrelevant
# block placed ahead of it. Truncating any one chunk's contribution keeps
# small, high-precision facts (curated knowledge-graph entities in
# particular) from being visually/contextually drowned out by raw,
# unchunked section text.
_MAX_CHUNK_TOKEN_FRACTION = 0.4


class ContextBuilder:
    """Turns ranked retrieval hits into one prompt-ready context block.

    Responsibilities: drop duplicate sources, merge chunks that clearly
    belong together (same paper/source-type/page), stay within a token
    budget, and keep a 1:1 mapping between each context block and a
    structured `Citation` so every answer can point back to its sources.
    """

    def build(self, chunks: list[RetrievedChunk], token_budget: int) -> ContextResult:
        deduped = self._dedupe(chunks)
        merged = self._merge_related(deduped)

        context_blocks: list[str] = []
        citations: list[Citation] = []
        used_tokens = 0

        max_chunk_chars = int(token_budget * _MAX_CHUNK_TOKEN_FRACTION) * 4

        for group in merged:
            block_index = len(context_blocks) + 1
            content = group["content"]
            if len(content) > max_chunk_chars:
                content = content[:max_chunk_chars].rstrip() + "…"
            block_text = f"[{block_index}] {content}"
            block_tokens = estimate_tokens(block_text)

            # See `_HARD_CEILING_MULTIPLIER` above for why this compares
            # against a multiple of the nominal budget rather than the
            # (possibly already-negative) remaining budget: `continue`ing
            # past a block that doesn't fit - rather than `break`ing the
            # whole loop - lets smaller, later-ranked chunks still land even
            # when an earlier, larger one didn't fit.
            if context_blocks and used_tokens + block_tokens > token_budget * _HARD_CEILING_MULTIPLIER:
                continue

            context_blocks.append(block_text)
            used_tokens += block_tokens
            citations.append(self._to_citation(block_index, group))

        return ContextResult(context_text="\n\n".join(context_blocks), citations=citations)

    def _dedupe(self, chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
        best_by_key: dict[tuple, RetrievedChunk] = {}

        for chunk in chunks:
            key = (chunk.paper_id, chunk.source_type, chunk.source_ref)
            if key not in best_by_key or chunk.score > best_by_key[key].score:
                best_by_key[key] = chunk

        return sorted(best_by_key.values(), key=lambda c: c.score, reverse=True)

    def _merge_related(self, chunks: list[RetrievedChunk]) -> list[dict[str, Any]]:
        groups: dict[tuple, dict[str, Any]] = {}
        order: list[tuple] = []

        for chunk in chunks:
            page_number = (chunk.metadata or {}).get("page_number")
            group_key = (
                (chunk.paper_id, chunk.source_type, page_number)
                if page_number is not None
                else (chunk.paper_id, chunk.source_type, chunk.source_ref)
            )

            if group_key not in groups:
                groups[group_key] = {
                    "paper_id": chunk.paper_id,
                    "source_type": chunk.source_type,
                    "source_ref": chunk.source_ref,
                    "content": chunk.content,
                    "metadata": chunk.metadata,
                    "score": chunk.score,
                }
                order.append(group_key)
            else:
                groups[group_key]["content"] += f"\n{chunk.content}"
                groups[group_key]["score"] = max(groups[group_key]["score"], chunk.score)

        return [groups[key] for key in order]

    def _to_citation(self, index: int, group: dict[str, Any]) -> Citation:
        metadata = group["metadata"] or {}
        source_type: EmbeddingSourceType = group["source_type"]
        source_ref: str = group["source_ref"]

        section_name = None
        if source_type == EmbeddingSourceType.SECTION and ":" in source_ref:
            section_name = source_ref.split(":", 1)[1]

        return Citation(
            index=index,
            paper_id=group["paper_id"],
            source_type=source_type,
            source_ref=source_ref,
            page_number=metadata.get("page_number"),
            section_name=section_name,
            score=group["score"],
        )
