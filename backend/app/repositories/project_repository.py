import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.repositories.base_repository import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Project, session)

    async def list_by_owner(
        self, owner_id: uuid.UUID, offset: int, limit: int
    ) -> tuple[list[Project], int]:
        base_query = select(Project).where(Project.owner_id == owner_id)

        count_query = select(func.count()).select_from(base_query.subquery())
        total = (await self.session.execute(count_query)).scalar_one()

        result = await self.session.execute(
            base_query.order_by(Project.created_at.desc()).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total

    async def delete(self, project: Project) -> None:
        await self.session.delete(project)

    async def list_by_ids(self, ids: list[uuid.UUID]) -> list[Project]:
        if not ids:
            return []
        result = await self.session.execute(select(Project).where(Project.id.in_(ids)))
        return list(result.scalars().all())
