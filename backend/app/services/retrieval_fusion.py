"""Combines vector-similarity and keyword-search hits into ranked, cite-able
chunks. Pure/session-agnostic so it is shared by the async `RetrievalService`
(FastAPI request path) and the sync Celery cache-warming task.
"""

import uuid

from app.agents.rrf import reciprocal_rank_fusion
from app.config.settings import settings
from app.models.embedding import Embedding
from app.schemas.rag import RetrievedChunk


def fuse_ranked_hits(
    vector_hits: list[tuple[Embedding, float]],
    keyword_hits: list[tuple[Embedding, float]],
    limit: int,
) -> list[RetrievedChunk]:
    embeddings_by_id: dict[uuid.UUID, Embedding] = {}

    vector_ranked_ids = []
    for embedding, _ in vector_hits:
        embeddings_by_id[embedding.id] = embedding
        vector_ranked_ids.append(embedding.id)

    keyword_ranked_ids = []
    for embedding, _ in keyword_hits:
        embeddings_by_id[embedding.id] = embedding
        keyword_ranked_ids.append(embedding.id)

    fused_scores = reciprocal_rank_fusion([vector_ranked_ids, keyword_ranked_ids], k=settings.RAG_RRF_K)
    ranked_ids = sorted(fused_scores, key=lambda item_id: fused_scores[item_id], reverse=True)[:limit]

    return [
        RetrievedChunk(
            id=embeddings_by_id[item_id].id,
            paper_id=embeddings_by_id[item_id].paper_id,
            knowledge_extraction_id=embeddings_by_id[item_id].knowledge_extraction_id,
            source_type=embeddings_by_id[item_id].source_type,
            source_ref=embeddings_by_id[item_id].source_ref,
            content=embeddings_by_id[item_id].content,
            metadata=embeddings_by_id[item_id].embedding_metadata,
            score=fused_scores[item_id],
        )
        for item_id in ranked_ids
    ]
