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
from app.models.generated_project import GeneratedProjectStatus
from app.models.user import User
from app.schemas.codegen import (
    GeneratedProjectDetailRead,
    GeneratedProjectDownloadResponse,
    GeneratedProjectRead,
)
from app.services.codegen_service import CodeGenerationService
from app.utils.exceptions import (
    GeneratedProjectNotFoundError,
    GeneratedProjectNotReadyError,
    PaperNotFoundError,
    PermissionDeniedError,
    ProjectNotFoundError,
)

router = APIRouter()

_NOT_FOUND_ERRORS = (ProjectNotFoundError, PaperNotFoundError, GeneratedProjectNotFoundError)


@router.get("/generated-projects/recent", response_model=list[GeneratedProjectRead])
async def list_recent_generated_projects(
    limit: int = Query(default=10, ge=1, le=50),
    statuses: list[GeneratedProjectStatus] | None = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> list[GeneratedProjectRead]:
    """Cross-project recent generated projects for the current user, newest
    first. Powers the dashboard's "Latest generated projects" and "Running
    jobs" widgets, neither of which has a single paper in scope."""
    return await CodeGenerationService(session).list_recent(current_user, limit, statuses)


@router.get("/papers/{paper_id}/generated-projects", response_model=list[GeneratedProjectRead])
async def list_generated_projects(
    paper_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> list[GeneratedProjectRead]:
    """Lists every generation version for a paper, newest first.

    There is no "create" endpoint here by design: a new generation is only
    ever queued by the LangGraph orchestrator's Code Generator agent (see
    `POST /orchestrator/query` with `generate_full_project=true`).
    """
    try:
        return await CodeGenerationService(session).list_versions(paper_id, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get("/papers/{paper_id}/generated-projects/latest", response_model=GeneratedProjectDetailRead)
async def get_latest_generated_project(
    paper_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> GeneratedProjectDetailRead:
    try:
        return await CodeGenerationService(session).get_latest(paper_id, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get(
    "/papers/{paper_id}/generated-projects/{version}",
    response_model=GeneratedProjectDetailRead,
)
async def get_generated_project_version(
    paper_id: uuid.UUID,
    version: int,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> GeneratedProjectDetailRead:
    try:
        return await CodeGenerationService(session).get_version(paper_id, version, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get(
    "/generated-projects/{generated_project_id}/download",
    response_model=GeneratedProjectDownloadResponse,
)
async def download_generated_project(
    generated_project_id: uuid.UUID,
    expires_in_seconds: int = Query(default=3600, ge=60, le=86400),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> GeneratedProjectDownloadResponse:
    """Returns a presigned URL to download the generated project as a ZIP."""
    try:
        url = await CodeGenerationService(session).get_download_url(generated_project_id, current_user)
    except GeneratedProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (ProjectNotFoundError, PaperNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except GeneratedProjectNotReadyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return GeneratedProjectDownloadResponse(url=url, expires_in_seconds=expires_in_seconds)


@router.websocket("/generated-projects/{generated_project_id}/progress")
async def generated_project_progress_websocket(
    websocket: WebSocket,
    generated_project_id: uuid.UUID,
    current_user: User = Depends(get_current_user_ws),
    session: AsyncSession = Depends(get_db),
) -> None:
    """Streams generation progress events for one project.

    The Celery task publishes each stage transition to a Redis channel
    (`codegen:progress:{id}`); this subscribes to that same channel and
    forwards messages to the client until a terminal stage is reached.
    """
    try:
        project = await CodeGenerationService(session).get_by_id(generated_project_id, current_user)
    except (GeneratedProjectNotFoundError, ProjectNotFoundError, PaperNotFoundError) as exc:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason=str(exc)) from exc

    await websocket.accept()
    await websocket.send_json({"type": "status", "stage": project.status.value})

    if project.status in (GeneratedProjectStatus.COMPLETED, GeneratedProjectStatus.FAILED):
        await websocket.close()
        return

    channel = f"codegen:progress:{generated_project_id}"
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue

            payload = json.loads(message["data"])
            await websocket.send_json({"type": "progress", **payload})

            if payload.get("stage") in ("completed", "failed"):
                break
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()
