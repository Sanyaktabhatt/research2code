import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.embedding import Embedding, EmbeddingSourceType
from app.observability.metrics import observe_duration, vector_search_duration_seconds
from app.repositories.base_repository import BaseRepository
from app.repositories.embedding_queries import keyword_search_stmt, similarity_search_stmt


class EmbeddingRepository(BaseRepository[Embedding]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Embedding, session)

    async def similarity_search(
        self,
        query_vector: list[float],
        owner_id: uuid.UUID,
        is_admin: bool,
        limit: int,
        source_types: list[EmbeddingSourceType] | None = None,
        paper_id: uuid.UUID | None = None,
    ) -> list[tuple[Embedding, float]]:
        """Cosine similarity search scoped to papers the caller can access.

        Returns (embedding, distance) pairs ordered by ascending cosine
        distance (i.e. most similar first). Similarity = 1 - distance.
        """
        stmt = similarity_search_stmt(query_vector, owner_id, is_admin, limit, source_types, paper_id)
        with observe_duration(vector_search_duration_seconds, search_type="similarity"):
            result = await self.session.execute(stmt)
        return [(embedding, score) for embedding, score in result.all()]

    async def keyword_search(
        self,
        query_text: str,
        owner_id: uuid.UUID,
        is_admin: bool,
        limit: int,
        source_types: list[EmbeddingSourceType] | None = None,
        paper_id: uuid.UUID | None = None,
    ) -> list[tuple[Embedding, float]]:
        """PostgreSQL full-text search fallback, scoped the same way as `similarity_search`.

        Returns (embedding, ts_rank) pairs ordered by descending rank.
        """
        stmt = keyword_search_stmt(query_text, owner_id, is_admin, limit, source_types, paper_id)
        with observe_duration(vector_search_duration_seconds, search_type="keyword"):
            result = await self.session.execute(stmt)
        return [(embedding, score) for embedding, score in result.all()]

    async def get_status_for_paper(self, paper_id: uuid.UUID) -> tuple[int, datetime | None]:
        result = await self.session.execute(
            select(func.count(Embedding.id), func.max(Embedding.created_at)).where(
                Embedding.paper_id == paper_id
            )
        )
        count, latest_created_at = result.one()
        return count, latest_created_at
