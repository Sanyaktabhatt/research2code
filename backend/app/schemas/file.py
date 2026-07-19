import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.file import FileCategory


class FileVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    version: int
    content_type: str
    size_bytes: int
    checksum_sha256: str
    created_at: datetime


class FileAssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    category: FileCategory
    original_filename: str
    latest_version: int
    created_at: datetime
    updated_at: datetime


class FileAssetDetailRead(FileAssetRead):
    versions: list[FileVersionRead]


class FileDownloadResponse(BaseModel):
    url: str
    expires_in_seconds: int
