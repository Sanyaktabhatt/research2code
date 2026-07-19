import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.codegen.schemas import GenerationOptions
from app.execution.celery_tasks import generate_project_task
from app.models.generated_project import GeneratedProject, GeneratedProjectStatus
from app.models.knowledge import KnowledgeExtractionStatus
from app.models.paper import Paper
from app.models.user import User
from app.repositories.generated_project_repository import GeneratedProjectRepository
from app.repositories.knowledge_repository import KnowledgeExtractionRepository
from app.repositories.paper_repository import PaperRepository
from app.services.project_service import ProjectService
from app.storage.file_storage import generate_presigned_url
from app.utils.exceptions import (
    GeneratedProjectNotFoundError,
    GeneratedProjectNotReadyError,
    KnowledgeExtractionNotCompletedError,
    KnowledgeExtractionNotFoundError,
    PaperNotFoundError,
)


class CodeGenerationService:
    """Generates, tracks, and serves versioned full-project code artifacts.

    `trigger_generation` is called from exactly one place: the LangGraph
    orchestrator's Code Generator node (see `app.workflows.graph_builder`) -
    every generation request goes through the orchestrator's Planner, so
    there is deliberately no separate "just trigger generation" REST
    endpoint here. The REST layer only lists/reads/downloads artifacts that
    already exist or are in progress.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.project_repository = GeneratedProjectRepository(session)
        self.knowledge_repository = KnowledgeExtractionRepository(session)
        self.paper_repository = PaperRepository(session)
        self.project_service = ProjectService(session)

    async def trigger_generation(
        self,
        paper_id: uuid.UUID,
        owner: User,
        options: GenerationOptions | None = None,
        research_notes: str = "",
        graph_facts_text: str = "",
        retrieval_context: str = "",
    ) -> GeneratedProject:
        """Queues a new generation version.

        `research_notes`/`graph_facts_text`/`retrieval_context` are whatever
        the orchestrator's Research Analyst/Graph/Retrieval agents had
        already produced earlier in the same pipeline run - passed straight
        through rather than re-computed, and persisted on the row so the
        Celery task (a separate process) can read them back.
        """
        await self._get_owned_paper(paper_id, owner)

        extraction = await self.knowledge_repository.get_latest(paper_id)
        if extraction is None:
            raise KnowledgeExtractionNotFoundError(paper_id)
        if extraction.status != KnowledgeExtractionStatus.COMPLETED:
            raise KnowledgeExtractionNotCompletedError(extraction.id)

        resolved_options = options or GenerationOptions()
        next_version = await self.project_repository.get_latest_version_number(paper_id) + 1

        project = GeneratedProject(
            paper_id=paper_id,
            knowledge_extraction_id=extraction.id,
            version=next_version,
            framework=resolved_options.framework.value,
            generation_params=resolved_options.model_dump(mode="json"),
            context_snapshot={
                "research_notes": research_notes,
                "graph_facts_text": graph_facts_text,
                "retrieval_context": retrieval_context,
            },
        )
        project = await self.project_repository.create(project)
        await self.session.commit()

        generate_project_task.delay(str(project.id))
        return project

    async def get_by_id(self, generated_project_id: uuid.UUID, owner: User) -> GeneratedProject:
        project = await self.project_repository.get_by_id(generated_project_id)
        if project is None:
            raise GeneratedProjectNotFoundError(generated_project_id)

        await self._get_owned_paper(project.paper_id, owner)
        return project

    async def get_latest(self, paper_id: uuid.UUID, owner: User) -> GeneratedProject:
        await self._get_owned_paper(paper_id, owner)

        project = await self.project_repository.get_latest(paper_id)
        if project is None:
            raise GeneratedProjectNotFoundError(paper_id)
        return project

    async def get_version(self, paper_id: uuid.UUID, version: int, owner: User) -> GeneratedProject:
        await self._get_owned_paper(paper_id, owner)

        project = await self.project_repository.get_by_paper_and_version(paper_id, version)
        if project is None:
            raise GeneratedProjectNotFoundError(f"{paper_id} (version {version})")
        return project

    async def list_versions(self, paper_id: uuid.UUID, owner: User) -> list[GeneratedProject]:
        await self._get_owned_paper(paper_id, owner)
        return await self.project_repository.list_by_paper(paper_id)

    async def list_recent(
        self, owner: User, limit: int, statuses: list[GeneratedProjectStatus] | None = None
    ) -> list[GeneratedProject]:
        """Cross-project recent generated projects for the dashboard's
        "Latest generated projects" / "Running jobs" widgets."""
        return await self.project_repository.list_recent_for_owner(owner.id, limit, statuses)

    async def get_download_url(self, generated_project_id: uuid.UUID, owner: User) -> str:
        project = await self.project_repository.get_by_id(generated_project_id)
        if project is None:
            raise GeneratedProjectNotFoundError(generated_project_id)

        await self._get_owned_paper(project.paper_id, owner)

        if project.status != GeneratedProjectStatus.COMPLETED or not project.storage_key:
            raise GeneratedProjectNotReadyError(generated_project_id)

        return await generate_presigned_url(project.storage_key)

    async def _get_owned_paper(self, paper_id: uuid.UUID, owner: User) -> Paper:
        paper = await self.paper_repository.get_by_id(paper_id)
        if paper is None:
            raise PaperNotFoundError(paper_id)

        await self.project_service.get_project(paper.project_id, owner)
        return paper
