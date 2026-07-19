import hashlib
import re
import uuid
from pathlib import PurePosixPath

from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.models.file import FileAsset, FileCategory, FileVersion
from app.models.user import User, UserRole
from app.repositories.file_repository import FileAssetRepository, FileVersionRepository
from app.storage.file_storage import generate_presigned_url, upload_object
from app.utils.exceptions import (
    FileAssetNotFoundError,
    FileTooLargeError,
    InvalidFileTypeError,
    PermissionDeniedError,
)

PDF_CONTENT_TYPES = {"application/pdf"}
IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}

_VALIDATION = {
    FileCategory.PDF: (PDF_CONTENT_TYPES, settings.MAX_PDF_SIZE_MB),
    FileCategory.IMAGE: (IMAGE_CONTENT_TYPES, settings.MAX_IMAGE_SIZE_MB),
}


class FileStorageService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.asset_repository = FileAssetRepository(session)
        self.version_repository = FileVersionRepository(session)

    async def upload(
        self,
        owner: User,
        category: FileCategory,
        filename: str,
        content_type: str | None,
        data: bytes,
        file_asset_id: uuid.UUID | None = None,
    ) -> FileVersion:
        """Uploads a new file, or a new version of an existing one, to MinIO and records its metadata."""
        self._validate(category, content_type, len(data))
        filename = _sanitize_filename(filename)

        if file_asset_id is not None:
            asset = await self._get_owned_asset(file_asset_id, owner)
            next_version = asset.latest_version + 1
        else:
            asset = FileAsset(
                owner_id=owner.id,
                category=category,
                original_filename=filename,
                latest_version=0,
            )
            asset = await self.asset_repository.add(asset)
            next_version = 1

        checksum = hashlib.sha256(data).hexdigest()
        storage_key = f"{category.value}/{asset.id}/v{next_version}/{filename}"
        await upload_object(storage_key, data, content_type)

        version = FileVersion(
            file_asset_id=asset.id,
            version=next_version,
            storage_key=storage_key,
            content_type=content_type or "application/octet-stream",
            size_bytes=len(data),
            checksum_sha256=checksum,
        )
        version = await self.version_repository.create(version)

        asset.latest_version = next_version
        await self.session.commit()
        await self.session.refresh(version)
        return version

    async def get_asset(self, file_asset_id: uuid.UUID, owner: User) -> FileAsset:
        return await self._get_owned_asset(file_asset_id, owner, with_versions=True)

    async def get_download_url(
        self, file_asset_id: uuid.UUID, owner: User, version: int | None = None
    ) -> str:
        asset = await self._get_owned_asset(file_asset_id, owner, with_versions=True)
        target_version = version or asset.latest_version

        file_version = next((v for v in asset.versions if v.version == target_version), None)
        if file_version is None:
            raise FileAssetNotFoundError(f"{file_asset_id} (version {target_version})")

        return await generate_presigned_url(file_version.storage_key)

    async def _get_owned_asset(
        self, file_asset_id: uuid.UUID, owner: User, with_versions: bool = False
    ) -> FileAsset:
        asset = (
            await self.asset_repository.get_with_versions(file_asset_id)
            if with_versions
            else await self.asset_repository.get_by_id(file_asset_id)
        )
        if asset is None:
            raise FileAssetNotFoundError(file_asset_id)
        if asset.owner_id != owner.id and owner.role != UserRole.ADMIN:
            raise PermissionDeniedError("You do not have access to this file")
        return asset

    def _validate(self, category: FileCategory, content_type: str | None, size_bytes: int) -> None:
        allowed_types, max_size_mb = _VALIDATION[category]

        if content_type not in allowed_types:
            raise InvalidFileTypeError(
                f"Invalid content type '{content_type}' for category '{category.value}'"
            )
        if size_bytes > max_size_mb * 1024 * 1024:
            raise FileTooLargeError(max_size_mb)


_UNSAFE_FILENAME_CHARS = re.compile(r"[^A-Za-z0-9_.-]")


def _sanitize_filename(filename: str) -> str:
    """Strips any directory components and disallowed characters from a
    user-supplied filename before it becomes part of a MinIO object key -
    otherwise a name like `../../other-user/v1/secret.pdf` could let an
    upload traverse into a path outside its intended `{category}/{asset_id}/`
    prefix."""
    name = PurePosixPath(filename.replace("\\", "/")).name or "file"
    name = _UNSAFE_FILENAME_CHARS.sub("_", name)
    return name.lstrip(".") or "file"
