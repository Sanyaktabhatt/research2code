import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.embedding import EmbeddingSourceType


class ConversationTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class RAGQueryRequest(BaseModel):
    query: str = Field(min_length=1)
    paper_id: uuid.UUID | None = None
    source_types: list[EmbeddingSourceType] | None = None
    history: list[ConversationTurn] = Field(default_factory=list)
    limit: int = Field(default=10, ge=1, le=50)
    token_budget: int | None = Field(default=None, ge=1)


class RetrievedChunk(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    paper_id: uuid.UUID
    knowledge_extraction_id: uuid.UUID | None
    source_type: EmbeddingSourceType
    source_ref: str
    content: str
    metadata: dict | None
    score: float


class Citation(BaseModel):
    index: int
    paper_id: uuid.UUID
    source_type: EmbeddingSourceType
    source_ref: str
    page_number: int | None = None
    section_name: str | None = None
    score: float


class ContextResult(BaseModel):
    context_text: str
    citations: list[Citation]


class RAGAnswer(BaseModel):
    answer: str
    citations: list[Citation]


class WarmCacheRequest(BaseModel):
    queries: list[str] | None = None


class WarmCacheResponse(BaseModel):
    paper_id: uuid.UUID
    queued: bool = True
