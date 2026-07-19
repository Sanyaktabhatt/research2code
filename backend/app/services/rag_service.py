import uuid
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.llm_provider import get_chat_model
from app.agents.rag_prompts import build_rag_messages
from app.config.settings import settings
from app.execution.celery_tasks import warm_rag_cache_task
from app.models.paper import Paper, PaperProcessingStatus
from app.models.user import User
from app.repositories.paper_repository import PaperRepository
from app.schemas.rag import ContextResult, RAGAnswer, RAGQueryRequest
from app.services.context_builder import ContextBuilder
from app.services.project_service import ProjectService
from app.services.retrieval_service import RetrievalService
from app.utils.exceptions import PaperNotFoundError, PaperNotParsedError


class RAGService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.retrieval_service = RetrievalService(session)
        self.context_builder = ContextBuilder()
        self.paper_repository = PaperRepository(session)
        self.project_service = ProjectService(session)

    async def answer(self, request: RAGQueryRequest, owner: User) -> RAGAnswer:
        context = await self._build_context(request, owner)
        messages = build_rag_messages(request.query, context.context_text, request.history)

        chat_model = get_chat_model()
        response = await chat_model.ainvoke(messages)

        return RAGAnswer(answer=response.content, citations=context.citations)

    async def stream_answer(
        self, request: RAGQueryRequest, owner: User
    ) -> tuple[AsyncIterator[str], ContextResult]:
        """Returns a text-delta stream plus the citations computed up front.

        Retrieval happens before generation starts (citations are known
        immediately), so a WebSocket handler can stream tokens as they
        arrive and send the citation list once the stream ends.
        """
        context = await self._build_context(request, owner)
        messages = build_rag_messages(request.query, context.context_text, request.history)

        chat_model = get_chat_model()

        async def _generate() -> AsyncIterator[str]:
            async for chunk in chat_model.astream(messages):
                if chunk.content:
                    yield chunk.content

        return _generate(), context

    async def trigger_cache_warm(
        self, paper_id: uuid.UUID, owner: User, queries: list[str] | None
    ) -> Paper:
        paper = await self._get_owned_paper(paper_id, owner)

        if paper.status != PaperProcessingStatus.COMPLETED:
            raise PaperNotParsedError(paper_id)

        warm_rag_cache_task.delay(str(paper_id), queries)
        return paper

    async def _build_context(self, request: RAGQueryRequest, owner: User) -> ContextResult:
        chunks = await self.retrieval_service.retrieve(
            query=request.query,
            owner=owner,
            paper_id=request.paper_id,
            source_types=request.source_types,
            limit=request.limit,
        )
        token_budget = request.token_budget or settings.RAG_CONTEXT_TOKEN_BUDGET
        return self.context_builder.build(chunks, token_budget)

    async def _get_owned_paper(self, paper_id: uuid.UUID, owner: User) -> Paper:
        paper = await self.paper_repository.get_by_id(paper_id)
        if paper is None:
            raise PaperNotFoundError(paper_id)

        await self.project_service.get_project(paper.project_id, owner)
        return paper
