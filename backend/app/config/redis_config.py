import redis
from redis import asyncio as aioredis

from app.config.settings import settings

_common_kwargs = {
    "encoding": "utf-8",
    "decode_responses": True,
    "max_connections": settings.REDIS_MAX_CONNECTIONS,
    "socket_timeout": settings.REDIS_SOCKET_TIMEOUT_SECONDS,
    "socket_connect_timeout": settings.REDIS_SOCKET_CONNECT_TIMEOUT_SECONDS,
    "health_check_interval": 30,
}

redis_client = aioredis.from_url(settings.REDIS_URL, **_common_kwargs)

# Synchronous client for Celery workers, which run outside the asyncio event
# loop that powers the FastAPI request path (mirrors the sync DB engine).
sync_redis_client = redis.Redis.from_url(settings.REDIS_URL, **_common_kwargs)


async def get_redis() -> aioredis.Redis:
    return redis_client


async def check_redis_connection() -> bool:
    return await redis_client.ping()


async def close_redis_connections() -> None:
    """Closes the async Redis connection pool. Called during graceful shutdown."""
    await redis_client.aclose()
