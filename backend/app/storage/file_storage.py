import asyncio
import io
import uuid
from datetime import timedelta

from app.config.settings import settings
from app.storage.minio_client import get_minio_client


async def save_file(data: bytes, filename: str, content_type: str | None, prefix: str = "papers") -> str:
    storage_key = f"{prefix}/{uuid.uuid4()}/{filename}"
    await upload_object(storage_key, data, content_type)
    return storage_key


async def upload_object(storage_key: str, data: bytes, content_type: str | None) -> None:
    def _upload() -> None:
        get_minio_client().put_object(
            bucket_name=settings.MINIO_BUCKET,
            object_name=storage_key,
            data=io.BytesIO(data),
            length=len(data),
            content_type=content_type or "application/octet-stream",
        )

    await asyncio.to_thread(_upload)


async def get_file_url(storage_key: str, expires_seconds: int = 3600) -> str:
    return await generate_presigned_url(storage_key, expires_seconds)


async def generate_presigned_url(storage_key: str, expires_seconds: int = 3600) -> str:
    def _presign() -> str:
        return get_minio_client().presigned_get_object(
            settings.MINIO_BUCKET, storage_key, expires=timedelta(seconds=expires_seconds)
        )

    return await asyncio.to_thread(_presign)


async def delete_object(storage_key: str) -> None:
    def _delete() -> None:
        get_minio_client().remove_object(settings.MINIO_BUCKET, storage_key)

    await asyncio.to_thread(_delete)
