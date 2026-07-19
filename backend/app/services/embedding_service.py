import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.embedding_provider import get_embedding_provider
from app.execution.celery_tasks import generate_paper_embeddings_task
from app.models.embedding import EmbeddingSourceType
from app.models.paper import Paper, PaperProcessingStatus
from app.models.user import User, UserRole
from app.repositories.embedding_repository import EmbeddingRepository
from app.repositories.paper_repository import PaperRepository
from app.schemas.embedding import EmbeddingSearchResult, EmbeddingStatusResponse
from app.services.project_service import ProjectService
from app.utils.exceptions import PaperNotFoundError, PaperNotParsedError


class EmbeddingService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.embedding_repository = EmbeddingRepository(session)
        self.paper_repository = PaperRepository(session)
        self.project_service = ProjectService(session)

    async def trigger_paper_embeddings(self, paper_id: uuid.UUID, owner: User) -> Paper:
        """Queues (re)generation of embeddings for a paper's sections, figures, tables and equations."""
        paper = await self._get_owned_paper(paper_id, owner)

        if paper.status != PaperProcessingStatus.COMPLETED:
            raise PaperNotParsedError(paper_id)

        generate_paper_embeddings_task.delay(str(paper_id))
        return paper

    async def search(
        self,
        query: str,
        owner: User,
        source_types: list[EmbeddingSourceType] | None,
        paper_id: uuid.UUID | None,
        limit: int,
    ) -> list[EmbeddingSearchResult]:
        provider = get_embedding_provider()
        query_vector = provider.embed_query(query)

        rows = await self.embedding_repository.similarity_search(
            query_vector=query_vector,
            owner_id=owner.id,
            is_admin=owner.role == UserRole.ADMIN,
            limit=limit,
            source_types=source_types,
            paper_id=paper_id,
        )

        return [
            EmbeddingSearchResult(
                id=embedding.id,
                paper_id=embedding.paper_id,
                knowledge_extraction_id=embedding.knowledge_extraction_id,
                source_type=embedding.source_type,
                source_ref=embedding.source_ref,
                content=embedding.content,
                metadata=embedding.embedding_metadata,
                score=1 - distance,
            )
            for embedding, distance in rows
        ]

    async def get_status(self, paper_id: uuid.UUID, owner: User) -> EmbeddingStatusResponse:
        await self._get_owned_paper(paper_id, owner)
        count, updated_at = await self.embedding_repository.get_status_for_paper(paper_id)
        return EmbeddingStatusResponse(
            paper_id=paper_id,
            status="completed" if count > 0 else "pending",
            count=count,
            updated_at=updated_at,
        )

    async def _get_owned_paper(self, paper_id: uuid.UUID, owner: User) -> Paper:
        paper = await self.paper_repository.get_by_id(paper_id)
        if paper is None:
            raise PaperNotFoundError(paper_id)

        await self.project_service.get_project(paper.project_id, owner)
        return paper
