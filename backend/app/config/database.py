from collections.abc import AsyncGenerator, Generator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config.settings import settings

_pool_kwargs = {
    "pool_size": settings.DB_POOL_SIZE,
    "max_overflow": settings.DB_MAX_OVERFLOW,
    "pool_timeout": settings.DB_POOL_TIMEOUT_SECONDS,
    "pool_pre_ping": settings.DB_POOL_PRE_PING,
    "pool_recycle": settings.DB_POOL_RECYCLE_SECONDS,
}

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG, future=True, **_pool_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Synchronous engine/session used by Celery workers, which run outside the
# asyncio event loop that powers the FastAPI request path. Pooled separately
# (one pool per worker process) - keep its size modest since each worker
# process only ever needs a handful of connections at a time.
sync_engine = create_engine(settings.SYNC_DATABASE_URL, echo=settings.DEBUG, future=True, **_pool_kwargs)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    class_=Session,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


@contextmanager
def get_sync_db() -> Generator[Session, None, None]:
    session = SyncSessionLocal()
    try:
        yield session
    finally:
        session.close()


async def check_database_connection() -> bool:
    from sqlalchemy import text

    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return True


async def dispose_database_engine() -> None:
    """Closes all pooled connections. Called during graceful shutdown."""
    await engine.dispose()
