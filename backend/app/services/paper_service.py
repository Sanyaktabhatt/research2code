import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.execution.celery_tasks import process_paper_task
from app.models.paper import Paper
from app.models.user import User
from app.repositories.paper_repository import PaperRepository
from app.services.project_service import ProjectService
from app.storage.file_storage import save_file
from app.utils.exceptions import PaperNotFoundError


class PaperService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.paper_repository = PaperRepository(session)
        self.project_service = ProjectService(session)

    async def upload_paper(
        self,
        project_id: uuid.UUID,
        owner: User,
        filename: str,
        content_type: str | None,
        data: bytes,
    ) -> Paper:
        # Ensures the project exists and the caller has access before accepting the upload.
        await self.project_service.get_project(project_id, owner)

        storage_key = await save_file(data, filename, content_type)

        paper = Paper(
            project_id=project_id,
            original_filename=filename,
            storage_key=storage_key,
            content_type=content_type,
            size_bytes=len(data),
        )
        paper = await self.paper_repository.create(paper)
        await self.session.commit()

        process_paper_task.delay(str(paper.id))

        return paper

    async def get_paper(self, project_id: uuid.UUID, paper_id: uuid.UUID, owner: User) -> Paper:
        # Ensures the caller still has access to the parent project before
        # returning parsing status/results for one of its papers.
        await self.project_service.get_project(project_id, owner)

        paper = await self.paper_repository.get_by_id(paper_id)
        if paper is None or paper.project_id != project_id:
            raise PaperNotFoundError(paper_id)

        return paper

    async def list_papers(self, project_id: uuid.UUID, owner: User) -> list[Paper]:
        await self.project_service.get_project(project_id, owner)
        return await self.paper_repository.list_by_project(project_id)

    async def list_recent(self, owner: User, limit: int) -> list[Paper]:
        """Cross-project recent papers for the dashboard's "Recent papers"
        widget."""
        return await self.paper_repository.list_recent_for_owner(owner.id, limit)
