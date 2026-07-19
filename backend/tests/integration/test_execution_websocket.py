"""WebSocket tests use FastAPI's sync TestClient (unlike the rest of the
integration suite, which uses an async httpx client) since that's what
supports `.websocket_connect()`. `ExecutionService.get_by_id` is patched
directly rather than seeding real DB rows, since ownership resolution is
already covered by the REST endpoint tests - this test is about the
WebSocket protocol itself (accept, initial status frame, early close on a
terminal status).
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.auth.dependencies import get_current_user_ws
from app.config.database import get_db
from app.main import app
from app.models.execution_run import ExecutionRunStatus


def _override_dependencies(test_user) -> None:
    async def _fake_get_db():
        yield None

    async def _fake_get_current_user_ws():
        return test_user

    app.dependency_overrides[get_db] = _fake_get_db
    app.dependency_overrides[get_current_user_ws] = _fake_get_current_user_ws


def test_execution_progress_websocket_closes_immediately_for_terminal_run(test_user) -> None:
    _override_dependencies(test_user)
    fake_run = SimpleNamespace(status=ExecutionRunStatus.COMPLETED)

    # Deliberately not using `with TestClient(app) as client:` here - that
    # form runs the app's real lifespan, which would dispose the module-level
    # DB/Redis/Neo4j connections shared with the rest of the test session. A
    # plain (non-context-manager) TestClient still supports
    # `websocket_connect` via its own ephemeral portal, with no lifespan
    # side effects.
    client = TestClient(app)

    try:
        with patch(
            "app.services.execution_service.ExecutionService.get_by_id",
            new=AsyncMock(return_value=fake_run),
        ):
            with client.websocket_connect(
                "/api/v1/execution-runs/00000000-0000-0000-0000-000000000000/progress"
            ) as websocket:
                message = websocket.receive_json()
                assert message == {"type": "status", "status": "completed"}
                # The server closes right after a terminal status - the next
                # frame should be the close handshake, not another message.
                with pytest.raises(WebSocketDisconnect):
                    websocket.receive_json()
    finally:
        app.dependency_overrides.clear()
