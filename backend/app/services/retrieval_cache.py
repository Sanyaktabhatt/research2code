"""Cache-key/(de)serialization helpers shared by the async retrieval path
(RetrievalService, used by real requests) and the sync Celery cache-warming
task. Both MUST produce identical keys and payload shapes, or warmed cache
entries would simply never be found by a real user query.
"""

import hashlib
import json
import uuid

from app.models.embedding import EmbeddingSourceType
from app.schemas.rag import RetrievedChunk


def build_retrieval_cache_key(
    query: str,
    owner_id: uuid.UUID,
    paper_id: uuid.UUID | None,
    source_types: list[EmbeddingSourceType] | None,
    limit: int,
) -> str:
    payload = {
        "query": query,
        "owner_id": str(owner_id),
        "paper_id": str(paper_id) if paper_id else None,
        "source_types": sorted(st.value for st in source_types) if source_types else None,
        "limit": limit,
    }
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    return f"rag:retrieval:{digest}"


def serialize_chunks(chunks: list[RetrievedChunk]) -> str:
    return json.dumps([chunk.model_dump(mode="json") for chunk in chunks])


def deserialize_chunks(raw: str) -> list[RetrievedChunk]:
    return [RetrievedChunk.model_validate(item) for item in json.loads(raw)]
