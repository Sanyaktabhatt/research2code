import uuid

from app.models.user import User
from app.schemas.rag import ContextResult
from app.services.context_builder import ContextBuilder
from app.services.retrieval_service import RetrievalService


class RetrievalAgent:
    """Wraps the existing hybrid RAG retrieval + context building so the
    orchestrator can invoke it as one step. No new retrieval logic lives
    here - vector similarity, keyword fallback, RRF and Redis caching are
    all handled by `RetrievalService` (see the RAG engine).
    """

    def __init__(self, retrieval_service: RetrievalService, context_builder: ContextBuilder) -> None:
        self.retrieval_service = retrieval_service
        self.context_builder = context_builder

    async def run(
        self,
        query: str,
        owner: User,
        paper_id: uuid.UUID | None,
        limit: int,
        token_budget: int,
    ) -> ContextResult:
        chunks = await self.retrieval_service.retrieve(
            query=query, owner=owner, paper_id=paper_id, limit=limit
        )
        return self.context_builder.build(chunks, token_budget)
