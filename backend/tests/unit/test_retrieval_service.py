import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.models.embedding import Embedding, EmbeddingSourceType
from app.models.user import User, UserRole
from app.services.retrieval_service import RetrievalService


def _make_embedding(source_ref: str, content: str) -> Embedding:
    embedding = Embedding(
        paper_id=uuid.uuid4(),
        knowledge_extraction_id=None,
        source_type=EmbeddingSourceType.SECTION,
        source_ref=source_ref,
        content=content,
        embedding_metadata={},
        model_provider="local",
        model_name="deterministic-hash-v1",
        embedding=[0.0] * 8,
    )
    embedding.id = uuid.uuid4()
    return embedding


@pytest.mark.asyncio
async def test_retrieve_returns_cached_result_without_querying_db() -> None:
    session = AsyncMock()
    service = RetrievalService(session)
    service.embedding_repository.similarity_search = AsyncMock()
    service.embedding_repository.keyword_search = AsyncMock()
    owner = User(id=uuid.uuid4(), email="a@example.com", hashed_password="x", role=UserRole.USER)

    with patch("app.services.retrieval_service.redis_client") as mock_redis:
        mock_redis.get = AsyncMock(return_value="[]")
        result = await service.retrieve("what is the dataset?", owner)

    assert result == []
    service.embedding_repository.similarity_search.assert_not_called()
    service.embedding_repository.keyword_search.assert_not_called()


@pytest.mark.asyncio
async def test_retrieve_fuses_vector_and_keyword_hits_on_cache_miss() -> None:
    session = AsyncMock()
    service = RetrievalService(session)
    owner = User(id=uuid.uuid4(), email="a@example.com", hashed_password="x", role=UserRole.USER)

    hit = _make_embedding("section:0", "Datasets used include ImageNet.")
    service.embedding_repository.similarity_search = AsyncMock(return_value=[(hit, 0.1)])
    service.embedding_repository.keyword_search = AsyncMock(return_value=[(hit, 0.9)])

    with (
        patch("app.services.retrieval_service.redis_client") as mock_redis,
        patch("app.services.retrieval_service.get_embedding_provider") as mock_get_provider,
    ):
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.set = AsyncMock()
        mock_provider = mock_get_provider.return_value
        mock_provider.embed_query.return_value = [0.1] * 8

        results = await service.retrieve("what datasets were used?", owner, limit=5)

    assert len(results) == 1
    assert results[0].content == "Datasets used include ImageNet."
    mock_redis.set.assert_awaited_once()
