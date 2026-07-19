import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.execution_run import ExecutionRun, ExecutionRunStatus
from app.models.paper import Paper
from app.models.project import Project
from app.repositories.base_repository import BaseRepository


class ExecutionRunRepository(BaseRepository[ExecutionRun]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(ExecutionRun, session)

    async def create(self, run: ExecutionRun) -> ExecutionRun:
        return await self.add(run)

    async def get_latest_version_number(self, generated_project_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.max(ExecutionRun.version)).where(
                ExecutionRun.generated_project_id == generated_project_id
            )
        )
        return result.scalar_one_or_none() or 0

    async def get_latest(self, generated_project_id: uuid.UUID) -> ExecutionRun | None:
        result = await self.session.execute(
            select(ExecutionRun)
            .where(ExecutionRun.generated_project_id == generated_project_id)
            .order_by(ExecutionRun.version.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_project_and_version(
        self, generated_project_id: uuid.UUID, version: int
    ) -> ExecutionRun | None:
        result = await self.session.execute(
            select(ExecutionRun).where(
                ExecutionRun.generated_project_id == generated_project_id,
                ExecutionRun.version == version,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_project(self, generated_project_id: uuid.UUID) -> list[ExecutionRun]:
        result = await self.session.execute(
            select(ExecutionRun)
            .where(ExecutionRun.generated_project_id == generated_project_id)
            .order_by(ExecutionRun.version.desc())
        )
        return list(result.scalars().all())

    async def list_by_ids(self, run_ids: list[uuid.UUID]) -> list[ExecutionRun]:
        result = await self.session.execute(select(ExecutionRun).where(ExecutionRun.id.in_(run_ids)))
        return list(result.scalars().all())

    async def list_recent_for_owner(
        self,
        owner_id: uuid.UUID,
        limit: int,
        statuses: list[ExecutionRunStatus] | None = None,
    ) -> list[ExecutionRun]:
        """Cross-project recent execution runs for one owner, newest first.
        Powers the dashboard's "Recent experiment runs" and "Running jobs"
        widgets, neither of which has a single generated project in scope."""
        query = (
            select(ExecutionRun)
            .join(Paper, ExecutionRun.paper_id == Paper.id)
            .join(Project, Paper.project_id == Project.id)
            .where(Project.owner_id == owner_id)
        )
        if statuses:
            query = query.where(ExecutionRun.status.in_(statuses))
        query = query.order_by(ExecutionRun.created_at.desc()).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())
