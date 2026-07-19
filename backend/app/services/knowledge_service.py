import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.execution.celery_tasks import extract_knowledge_task
from app.models.knowledge import KnowledgeExtraction
from app.models.paper import Paper, PaperProcessingStatus
from app.models.user import User
from app.repositories.knowledge_repository import KnowledgeExtractionRepository
from app.repositories.paper_repository import PaperRepository
from app.services.project_service import ProjectService
from app.utils.exceptions import (
    KnowledgeExtractionNotFoundError,
    PaperNotFoundError,
    PaperNotParsedError,
)


class KnowledgeExtractionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.knowledge_repository = KnowledgeExtractionRepository(session)
        self.paper_repository = PaperRepository(session)
        self.project_service = ProjectService(session)

    async def trigger_extraction(self, paper_id: uuid.UUID, owner: User) -> KnowledgeExtraction:
        """Queues a new extraction version for an already-parsed paper.

        Never touches the source PDF: it reads `Paper.parsed_data`, so
        re-extraction (after a prompt/model change, for example) is cheap
        and does not require re-running the parsing pipeline.
        """
        paper = await self._get_owned_paper(paper_id, owner)

        if paper.status != PaperProcessingStatus.COMPLETED:
            raise PaperNotParsedError(paper_id)

        next_version = await self.knowledge_repository.get_latest_version_number(paper_id) + 1
        extraction = KnowledgeExtraction(paper_id=paper_id, version=next_version)
        extraction = await self.knowledge_repository.create(extraction)
        await self.session.commit()

        extract_knowledge_task.delay(str(extraction.id))

        return extraction

    async def get_latest(self, paper_id: uuid.UUID, owner: User) -> KnowledgeExtraction:
        await self._get_owned_paper(paper_id, owner)

        extraction = await self.knowledge_repository.get_latest(paper_id)
        if extraction is None:
            raise KnowledgeExtractionNotFoundError(paper_id)

        return extraction

    async def get_version(
        self, paper_id: uuid.UUID, version: int, owner: User
    ) -> KnowledgeExtraction:
        await self._get_owned_paper(paper_id, owner)

        extraction = await self.knowledge_repository.get_by_paper_and_version(paper_id, version)
        if extraction is None:
            raise KnowledgeExtractionNotFoundError(f"{paper_id} (version {version})")

        return extraction

    async def list_versions(self, paper_id: uuid.UUID, owner: User) -> list[KnowledgeExtraction]:
        await self._get_owned_paper(paper_id, owner)
        return await self.knowledge_repository.list_by_paper(paper_id)

    async def _get_owned_paper(self, paper_id: uuid.UUID, owner: User) -> Paper:
        paper = await self.paper_repository.get_by_id(paper_id)
        if paper is None:
            raise PaperNotFoundError(paper_id)

        # Verifies the caller has access to the paper's parent project.
        await self.project_service.get_project(paper.project_id, owner)
        return paper
