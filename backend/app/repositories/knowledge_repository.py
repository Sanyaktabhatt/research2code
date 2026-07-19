import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KnowledgeExtraction
from app.repositories.base_repository import BaseRepository


class KnowledgeExtractionRepository(BaseRepository[KnowledgeExtraction]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(KnowledgeExtraction, session)

    async def create(self, extraction: KnowledgeExtraction) -> KnowledgeExtraction:
        return await self.add(extraction)

    async def get_latest_version_number(self, paper_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.max(KnowledgeExtraction.version)).where(
                KnowledgeExtraction.paper_id == paper_id
            )
        )
        return result.scalar_one_or_none() or 0

    async def get_latest(self, paper_id: uuid.UUID) -> KnowledgeExtraction | None:
        result = await self.session.execute(
            select(KnowledgeExtraction)
            .where(KnowledgeExtraction.paper_id == paper_id)
            .order_by(KnowledgeExtraction.version.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_paper_and_version(
        self, paper_id: uuid.UUID, version: int
    ) -> KnowledgeExtraction | None:
        result = await self.session.execute(
            select(KnowledgeExtraction).where(
                KnowledgeExtraction.paper_id == paper_id,
                KnowledgeExtraction.version == version,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_paper(self, paper_id: uuid.UUID) -> list[KnowledgeExtraction]:
        result = await self.session.execute(
            select(KnowledgeExtraction)
            .where(KnowledgeExtraction.paper_id == paper_id)
            .order_by(KnowledgeExtraction.version.desc())
        )
        return list(result.scalars().all())
