import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.embedding import EmbeddingSourceType


class EmbeddingIndexTriggerResponse(BaseModel):
    paper_id: uuid.UUID
    queued: bool = True


class EmbeddingStatusResponse(BaseModel):
    """Whether embedding generation has produced any vectors for a paper yet.

    There's no persisted "in progress" state for the batch as a whole (only
    individual vector rows appear once written), so this only distinguishes
    "nothing indexed yet" from "at least one vector indexed" - it can't
    report a genuine "processing" state without extra plumbing.
    """

    paper_id: uuid.UUID
    status: Literal["pending", "completed"]
    count: int
    updated_at: datetime | None


class EmbeddingSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    source_types: list[EmbeddingSourceType] | None = None
    paper_id: uuid.UUID | None = None
    limit: int = Field(default=10, ge=1, le=100)


class EmbeddingSearchResult(BaseModel):
    id: uuid.UUID
    paper_id: uuid.UUID
    knowledge_extraction_id: uuid.UUID | None
    source_type: EmbeddingSourceType
    source_ref: str
    content: str
    metadata: dict | None
    score: float = Field(description="Cosine similarity, higher is more similar (max 1.0)")
