import json
import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    WebSocketException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user, get_current_user_ws
from app.config.database import get_db
from app.config.redis_config import redis_client
from app.models.execution_run import ExecutionRunStatus
from app.models.user import User
from app.schemas.execution import (
    ComparisonRequest,
    ComparisonResult,
    ExecutionRunDetailRead,
    ExecutionRunRead,
    LogDownloadResponse,
    TensorBoardUrlResponse,
    TriggerExecutionRequest,
)
from app.services.execution_comparison_service import ExecutionComparisonService
from app.services.execution_service import ExecutionService
from app.utils.exceptions import (
    ExecutionRunNotCancellableError,
    ExecutionRunNotFoundError,
    GeneratedProjectNotFoundError,
    GeneratedProjectNotReadyError,
    PaperNotFoundError,
    PermissionDeniedError,
    ProjectNotFoundError,
)

router = APIRouter()

_NOT_FOUND_ERRORS = (
    ProjectNotFoundError,
    PaperNotFoundError,
    GeneratedProjectNotFoundError,
    ExecutionRunNotFoundError,
)
_TERMINAL_STATUSES = (
    ExecutionRunStatus.COMPLETED,
    ExecutionRunStatus.FAILED,
    ExecutionRunStatus.CANCELLED,
)
_TERMINAL_STATUS_VALUES = {status_value.value for status_value in _TERMINAL_STATUSES}


@router.get("/execution-runs/recent", response_model=list[ExecutionRunRead])
async def list_recent_execution_runs(
    limit: int = Query(default=10, ge=1, le=50),
    statuses: list[ExecutionRunStatus] | None = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> list[ExecutionRunRead]:
    """Cross-project recent execution runs for the current user, newest
    first. Powers the dashboard's "Recent experiment runs" and "Running
    jobs" widgets, neither of which has a single generated project in
    scope."""
    return await ExecutionService(session).list_recent(current_user, limit, statuses)


@router.post(
    "/generated-projects/{generated_project_id}/execution-runs",
    response_model=ExecutionRunRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_execution_run(
    generated_project_id: uuid.UUID,
    payload: TriggerExecutionRequest | None = None,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> ExecutionRunRead:
    """Queues a new execution run (a new version) for a completed generated project.

    A retry is just calling this again - it always creates a fresh,
    independently-tracked version rather than mutating a prior attempt.
    """
    try:
        return await ExecutionService(session).trigger_run(
            generated_project_id, current_user, payload or TriggerExecutionRequest()
        )
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except GeneratedProjectNotReadyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get(
    "/generated-projects/{generated_project_id}/execution-runs",
    response_model=list[ExecutionRunRead],
)
async def list_execution_runs(
    generated_project_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> list[ExecutionRunRead]:
    try:
        return await ExecutionService(session).list_versions(generated_project_id, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get(
    "/generated-projects/{generated_project_id}/execution-runs/latest",
    response_model=ExecutionRunDetailRead,
)
async def get_latest_execution_run(
    generated_project_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> ExecutionRunDetailRead:
    try:
        return await ExecutionService(session).get_latest(generated_project_id, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get(
    "/generated-projects/{generated_project_id}/execution-runs/{version}",
    response_model=ExecutionRunDetailRead,
)
async def get_execution_run_version(
    generated_project_id: uuid.UUID,
    version: int,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> ExecutionRunDetailRead:
    try:
        return await ExecutionService(session).get_version(generated_project_id, version, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/execution-runs/{execution_run_id}/cancel", response_model=ExecutionRunRead)
async def cancel_execution_run(
    execution_run_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> ExecutionRunRead:
    """Requests cancellation. A queued run is cancelled immediately; a
    running one is stopped by the worker on its next monitoring tick (a few
    seconds), which then transitions it to CANCELLED itself.
    """
    try:
        return await ExecutionService(session).cancel_run(execution_run_id, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ExecutionRunNotCancellableError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/execution-runs/{execution_run_id}/logs/download", response_model=LogDownloadResponse)
async def download_execution_logs(
    execution_run_id: uuid.UUID,
    expires_in_seconds: int = Query(default=3600, ge=60, le=86400),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> LogDownloadResponse:
    try:
        url = await ExecutionService(session).get_log_download_url(execution_run_id, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return LogDownloadResponse(url=url, expires_in_seconds=expires_in_seconds)


@router.get("/execution-runs/{execution_run_id}/tensorboard", response_model=TensorBoardUrlResponse)
async def get_execution_tensorboard_url(
    execution_run_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> TensorBoardUrlResponse:
    try:
        url = await ExecutionService(session).get_tensorboard_url_for_run(execution_run_id, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return TensorBoardUrlResponse(url=url)


@router.post("/execution-runs/compare", response_model=ComparisonResult)
async def compare_execution_runs(
    payload: ComparisonRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> ComparisonResult:
    """Compares parameters/metrics across runs and identifies the best one."""
    try:
        return await ExecutionComparisonService(session).compare(payload, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.websocket("/execution-runs/{execution_run_id}/progress")
async def execution_run_progress_websocket(
    websocket: WebSocket,
    execution_run_id: uuid.UUID,
    current_user: User = Depends(get_current_user_ws),
    session: AsyncSession = Depends(get_db),
) -> None:
    """Streams live log lines and resource/progress metrics for one run.

    The Celery task publishes every log line and periodic resource snapshot
    to a Redis channel (`execution:progress:{id}`); this subscribes to that
    same channel and forwards messages until the run reaches a terminal
    status.
    """
    try:
        run = await ExecutionService(session).get_by_id(execution_run_id, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason=str(exc)) from exc

    await websocket.accept()
    await websocket.send_json({"type": "status", "status": run.status.value})

    if run.status in _TERMINAL_STATUSES:
        await websocket.close()
        return

    channel = f"execution:progress:{execution_run_id}"
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue

            payload = json.loads(message["data"])
            await websocket.send_json(payload)

            if payload.get("type") == "status" and payload.get("status") in _TERMINAL_STATUS_VALUES:
                break
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()
