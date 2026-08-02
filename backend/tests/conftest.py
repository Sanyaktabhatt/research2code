"""Shared pytest fixtures.

Integration tests run against a real PostgreSQL (with pgvector) and Redis -
matching this codebase's SQLAlchemy dialect-specific columns (native UUID,
`Vector`) closely enough that a SQLite substitute would hide real bugs. CI
provisions both as service containers (see `.github/workflows/ci.yml`); the
default settings already point at `localhost`, so no extra configuration is
needed to run these locally against a `docker compose up postgres redis`.

The schema is built by running the real Alembic migrations (not
`Base.metadata.create_all`) so the test suite exercises the same schema
production deploys get, and a broken migration fails the whole test session
immediately instead of only surfacing in a separate, easy-to-skip CI step.
"""

import uuid
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt_handler import create_access_token, hash_password
from app.config.database import AsyncSessionLocal, Base, engine, get_db
from app.main import app as fastapi_app
from app.models.user import User, UserRole

_BACKEND_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def _prepare_database() -> None:
    # A plain (non-async) fixture on purpose: `env.py` drives the migration
    # via `asyncio.run(...)`, which raises if called from inside an already-
    # running event loop - as it would be if this fixture were async and
    # pytest-asyncio's loop were active.
    alembic_cfg = Config(str(_BACKEND_ROOT / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(_BACKEND_ROOT / "alembic"))
    command.upgrade(alembic_cfg, "head")


@pytest_asyncio.fixture
async def db_session(_prepare_database: None) -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()
        # Isolate tests from each other without re-running migrations: wipe
        # every table's rows (children before parents, per FK dependency
        # order) regardless of whether the test itself committed.
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()
    # `engine` is a module-level singleton, but pytest-asyncio gives each test
    # function its own event loop; asyncpg connections are bound to the loop
    # they were created on, so a pooled connection from a previous test's loop
    # would fail with "attached to a different loop" here. Disposing forces
    # the next test to open fresh connections on its own loop.
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    fastapi_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
    fastapi_app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    user = User(
        email=f"user-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=hash_password("correct-horse-battery-staple"),
        role=UserRole.USER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    token = create_access_token(str(test_user.id), test_user.role)
    return {"Authorization": f"Bearer {token}"}
