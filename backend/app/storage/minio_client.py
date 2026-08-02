import asyncio
from functools import lru_cache
from typing import Any

import urllib3
from minio import Minio

from app.config.settings import settings
from app.utils.circuit_breaker import CircuitBreaker

_minio_breaker = CircuitBreaker(
    name="minio",
    failure_threshold=settings.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    recovery_seconds=settings.CIRCUIT_BREAKER_RECOVERY_SECONDS,
)

_BREAKER_GUARDED_METHODS = (
    "put_object",
    "fput_object",
    "get_object",
    "remove_object",
    "presigned_get_object",
    "bucket_exists",
)


class ResilientMinioClient:
    """Duck-typed proxy around `minio.Minio` that routes the I/O methods
    actually used in this codebase through a circuit breaker, so a MinIO
    outage fails fast (after `CIRCUIT_BREAKER_FAILURE_THRESHOLD` failures)
    instead of every caller independently blocking on the timeout above.
    Every other attribute (rarely-used methods, introspection) passes
    through untouched."""

    def __init__(self, inner: Minio, breaker: CircuitBreaker) -> None:
        self._inner = inner
        self._breaker = breaker

    def __getattr__(self, name: str) -> Any:
        attr = getattr(self._inner, name)
        if name in _BREAKER_GUARDED_METHODS and callable(attr):
            return lambda *args, **kwargs: self._breaker.call(attr, *args, **kwargs)
        return attr


@lru_cache
def get_minio_client() -> ResilientMinioClient:
    # minio-py's default PoolManager uses a 5-minute connect/read timeout,
    # which is far too long to notice a genuinely unreachable MinIO endpoint
    # from a request path or a Celery task that should fail fast and retry.
    http_client = urllib3.PoolManager(
        timeout=urllib3.Timeout(
            connect=settings.MINIO_CONNECT_TIMEOUT_SECONDS,
            read=settings.MINIO_READ_TIMEOUT_SECONDS,
        ),
        maxsize=10,
        retries=urllib3.Retry(total=3, backoff_factor=0.2, status_forcelist=[500, 502, 503, 504]),
    )
    client = Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE,
        http_client=http_client,
    )
    if not client.bucket_exists(settings.MINIO_BUCKET):
        client.make_bucket(settings.MINIO_BUCKET)
    return ResilientMinioClient(client, _minio_breaker)


@lru_cache
def get_minio_public_client() -> Minio:
    """Client used only to *sign* presigned URLs meant for browser
    consumption - never to actually connect to MinIO.

    Presigned-URL generation is a purely local HMAC computation, so this
    never has to actually reach `MINIO_PUBLIC_ENDPOINT` (which, being a
    Docker-internal hostname's host-facing counterpart, may not even be
    reachable *from inside* this container) - it only needs that host baked
    into the signature. `region` must still be given explicitly: without it,
    minio-py's first presign falls back to a real `GetBucketLocation` call
    against this same unreachable-from-here endpoint to discover it. See
    `MINIO_PUBLIC_ENDPOINT`'s docstring in settings.py for why this client's
    endpoint differs from the internal `get_minio_client()`'s.
    """
    return Minio(
        settings.MINIO_PUBLIC_ENDPOINT or settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE,
        region="us-east-1",
    )


async def check_minio_connection() -> bool:
    # minio-py is a synchronous SDK; offload to a worker thread so a slow/down
    # MinIO endpoint can't block the event loop during a readiness check.
    return await asyncio.to_thread(get_minio_client().bucket_exists, settings.MINIO_BUCKET)
