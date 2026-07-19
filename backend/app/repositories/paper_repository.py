import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.paper import Paper
from app.models.project import Project
from app.repositories.base_repository import BaseRepository


class PaperRepository(BaseRepository[Paper]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Paper, session)

    async def create(self, paper: Paper) -> Paper:
        return await self.add(paper)

    async def list_by_ids(self, ids: list[uuid.UUID]) -> list[Paper]:
        if not ids:
            return []
        result = await self.session.execute(select(Paper).where(Paper.id.in_(ids)))
        return list(result.scalars().all())

    async def list_by_project(self, project_id: uuid.UUID) -> list[Paper]:
        result = await self.session.execute(
            select(Paper).where(Paper.project_id == project_id).order_by(Paper.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_recent_for_owner(self, owner_id: uuid.UUID, limit: int) -> list[Paper]:
        """Cross-project recent papers for one owner, newest first. Powers
        the dashboard's "Recent papers" widget, which has no single project
        in scope."""
        result = await self.session.execute(
            select(Paper)
            .join(Project, Paper.project_id == Project.id)
            .where(Project.owner_id == owner_id)
            .order_by(Paper.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
