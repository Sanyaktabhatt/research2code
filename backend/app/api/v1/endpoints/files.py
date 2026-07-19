import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.config.database import get_db
from app.config.settings import settings
from app.models.file import FileCategory
from app.models.user import User
from app.schemas.file import FileAssetDetailRead, FileDownloadResponse, FileVersionRead
from app.services.file_storage_service import FileStorageService
from app.utils.exceptions import (
    FileAssetNotFoundError,
    FileTooLargeError,
    InvalidFileTypeError,
    PermissionDeniedError,
)

router = APIRouter()

_UPLOAD_CHUNK_SIZE = 1024 * 1024  # 1 MiB
_MAX_SIZE_MB_BY_CATEGORY = {
    FileCategory.PDF: settings.MAX_PDF_SIZE_MB,
    FileCategory.IMAGE: settings.MAX_IMAGE_SIZE_MB,
}


async def _read_upload_capped(file: UploadFile, max_size_mb: int) -> bytes:
    """Reads the upload in bounded chunks, aborting as soon as the category's
    size limit is exceeded - rather than buffering an arbitrarily large body
    into memory first and only checking its size afterwards, which lets an
    oversized (or malicious, unbounded chunked-transfer) upload exhaust
    worker memory before ever being rejected."""
    max_bytes = max_size_mb * 1024 * 1024
    chunks: list[bytes] = []
    total = 0

    while True:
        chunk = await file.read(_UPLOAD_CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise FileTooLargeError(max_size_mb)
        chunks.append(chunk)

    return b"".join(chunks)


async def _upload(
    category: FileCategory,
    file: UploadFile,
    file_asset_id: uuid.UUID | None,
    current_user: User,
    session: AsyncSession,
) -> FileVersionRead:
    try:
        data = await _read_upload_capped(file, _MAX_SIZE_MB_BY_CATEGORY[category])
        return await FileStorageService(session).upload(
            current_user,
            category,
            file.filename or category.value,
            file.content_type,
            data,
            file_asset_id,
        )
    except (InvalidFileTypeError, FileTooLargeError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except FileAssetNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/pdf", response_model=FileVersionRead, status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    file: UploadFile,
    file_asset_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> FileVersionRead:
    return await _upload(FileCategory.PDF, file, file_asset_id, current_user, session)


@router.post("/images", response_model=FileVersionRead, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile,
    file_asset_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> FileVersionRead:
    return await _upload(FileCategory.IMAGE, file, file_asset_id, current_user, session)


@router.get("/{file_asset_id}", response_model=FileAssetDetailRead)
async def get_file_asset(
    file_asset_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> FileAssetDetailRead:
    try:
        return await FileStorageService(session).get_asset(file_asset_id, current_user)
    except FileAssetNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get("/{file_asset_id}/download", response_model=FileDownloadResponse)
async def download_file(
    file_asset_id: uuid.UUID,
    version: int | None = Query(default=None, ge=1),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> FileDownloadResponse:
    try:
        url = await FileStorageService(session).get_download_url(file_asset_id, current_user, version)
    except FileAssetNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return FileDownloadResponse(url=url, expires_in_seconds=3600)
