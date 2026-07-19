import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.generated_project import GeneratedProject, GeneratedProjectStatus
from app.models.paper import Paper
from app.models.project import Project
from app.repositories.base_repository import BaseRepository


class GeneratedProjectRepository(BaseRepository[GeneratedProject]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(GeneratedProject, session)

    async def create(self, project: GeneratedProject) -> GeneratedProject:
        return await self.add(project)

    async def get_latest_version_number(self, paper_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.max(GeneratedProject.version)).where(GeneratedProject.paper_id == paper_id)
        )
        return result.scalar_one_or_none() or 0

    async def get_latest(self, paper_id: uuid.UUID) -> GeneratedProject | None:
        result = await self.session.execute(
            select(GeneratedProject)
            .where(GeneratedProject.paper_id == paper_id)
            .order_by(GeneratedProject.version.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_paper_and_version(
        self, paper_id: uuid.UUID, version: int
    ) -> GeneratedProject | None:
        result = await self.session.execute(
            select(GeneratedProject).where(
                GeneratedProject.paper_id == paper_id,
                GeneratedProject.version == version,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_paper(self, paper_id: uuid.UUID) -> list[GeneratedProject]:
        result = await self.session.execute(
            select(GeneratedProject)
            .where(GeneratedProject.paper_id == paper_id)
            .order_by(GeneratedProject.version.desc())
        )
        return list(result.scalars().all())

    async def list_recent_for_owner(
        self,
        owner_id: uuid.UUID,
        limit: int,
        statuses: list[GeneratedProjectStatus] | None = None,
    ) -> list[GeneratedProject]:
        """Cross-project recent generated projects for one owner, newest
        first. Powers the dashboard's "Latest generated projects" and
        "Running jobs" widgets, neither of which has a single paper in
        scope."""
        query = (
            select(GeneratedProject)
            .join(Paper, GeneratedProject.paper_id == Paper.id)
            .join(Project, Paper.project_id == Project.id)
            .where(Project.owner_id == owner_id)
        )
        if statuses:
            query = query.where(GeneratedProject.status.in_(statuses))
        query = query.order_by(GeneratedProject.created_at.desc()).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())
