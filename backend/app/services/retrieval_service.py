import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.embedding_provider import get_embedding_provider
from app.config.redis_config import redis_client
from app.config.settings import settings
from app.models.embedding import EmbeddingSourceType
from app.models.user import User, UserRole
from app.repositories.embedding_repository import EmbeddingRepository
from app.schemas.rag import RetrievedChunk
from app.services.retrieval_cache import build_retrieval_cache_key, deserialize_chunks, serialize_chunks
from app.services.retrieval_fusion import fuse_ranked_hits


class RetrievalService:
    """Hybrid retrieval over the embedding index: vector similarity + metadata
    filtering + PostgreSQL full-text keyword fallback, combined with
    Reciprocal Rank Fusion. Results are cached in Redis per (query, caller,
    filters) since embedding + two DB scans is comparatively expensive.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.embedding_repository = EmbeddingRepository(session)

    async def retrieve(
        self,
        query: str,
        owner: User,
        paper_id: uuid.UUID | None = None,
        source_types: list[EmbeddingSourceType] | None = None,
        limit: int = 10,
    ) -> list[RetrievedChunk]:
        cache_key = build_retrieval_cache_key(query, owner.id, paper_id, source_types, limit)

        cached = await redis_client.get(cache_key)
        if cached:
            return deserialize_chunks(cached)

        is_admin = owner.role == UserRole.ADMIN
        provider = get_embedding_provider()
        query_vector = provider.embed_query(query)

        # Widen the candidate pool before fusion so RRF has enough signal to work with.
        fetch_limit = max(limit * 4, 20)

        vector_hits = await self.embedding_repository.similarity_search(
            query_vector, owner.id, is_admin, fetch_limit, source_types, paper_id
        )
        keyword_hits = await self.embedding_repository.keyword_search(
            query, owner.id, is_admin, fetch_limit, source_types, paper_id
        )

        results = fuse_ranked_hits(vector_hits, keyword_hits, limit)

        await redis_client.set(cache_key, serialize_chunks(results), ex=settings.RAG_CACHE_TTL_SECONDS)

        return results
