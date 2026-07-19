from neo4j import AsyncDriver, AsyncGraphDatabase, Driver, GraphDatabase

from app.config.settings import settings

_auth = (settings.NEO4J_USER, settings.NEO4J_PASSWORD)
_driver_kwargs = {
    "connection_timeout": settings.NEO4J_CONNECTION_TIMEOUT_SECONDS,
    "max_connection_pool_size": settings.NEO4J_MAX_CONNECTION_POOL_SIZE,
}

# Async driver for the FastAPI request path.
async_neo4j_driver: AsyncDriver = AsyncGraphDatabase.driver(settings.NEO4J_URI, auth=_auth, **_driver_kwargs)

# Sync driver for Celery workers, which run outside the asyncio event loop
# (mirrors the sync Postgres engine and sync Redis client used elsewhere).
sync_neo4j_driver: Driver = GraphDatabase.driver(settings.NEO4J_URI, auth=_auth, **_driver_kwargs)


async def check_neo4j_connection() -> bool:
    async with async_neo4j_driver.session() as session:
        result = await session.run("RETURN 1")
        await result.consume()
    return True


async def close_neo4j_driver() -> None:
    """Closes the async Neo4j driver's connection pool. Called during graceful shutdown."""
    await async_neo4j_driver.close()
