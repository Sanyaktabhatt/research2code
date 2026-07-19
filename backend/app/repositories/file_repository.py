import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.file import FileAsset, FileVersion
from app.repositories.base_repository import BaseRepository


class FileAssetRepository(BaseRepository[FileAsset]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(FileAsset, session)

    async def get_with_versions(self, file_asset_id: uuid.UUID) -> FileAsset | None:
        result = await self.session.execute(
            select(FileAsset)
            .where(FileAsset.id == file_asset_id)
            .options(selectinload(FileAsset.versions))
        )
        return result.scalar_one_or_none()


class FileVersionRepository(BaseRepository[FileVersion]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(FileVersion, session)

    async def create(self, version: FileVersion) -> FileVersion:
        return await self.add(version)

    async def get_by_asset_and_version(
        self, file_asset_id: uuid.UUID, version: int
    ) -> FileVersion | None:
        result = await self.session.execute(
            select(FileVersion).where(
                FileVersion.file_asset_id == file_asset_id,
                FileVersion.version == version,
            )
        )
        return result.scalar_one_or_none()
