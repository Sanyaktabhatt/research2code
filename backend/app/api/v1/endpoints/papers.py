import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.config.database import get_db
from app.models.user import User
from app.schemas.paper import PaperDetailRead, PaperRead
from app.services.paper_service import PaperService
from app.utils.exceptions import PaperNotFoundError, PermissionDeniedError, ProjectNotFoundError

router = APIRouter()


@router.get("/papers/recent", response_model=list[PaperRead])
async def list_recent_papers(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> list[PaperRead]:
    """Cross-project recent papers for the current user, newest first.
    Powers the dashboard's "Recent papers" widget, which has no single
    project in scope."""
    return await PaperService(session).list_recent(current_user, limit)


@router.get("/projects/{project_id}/papers", response_model=list[PaperRead])
async def list_papers(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> list[PaperRead]:
    try:
        return await PaperService(session).list_papers(project_id, current_user)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post(
    "/projects/{project_id}/papers",
    response_model=PaperRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_paper(
    project_id: uuid.UUID,
    file: UploadFile,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> PaperRead:
    """Accepts and stores a paper file, then queues it for async parsing."""
    try:
        data = await file.read()
        return await PaperService(session).upload_paper(
            project_id, current_user, file.filename or "upload.pdf", file.content_type, data
        )
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get(
    "/projects/{project_id}/papers/{paper_id}",
    response_model=PaperDetailRead,
)
async def get_paper(
    project_id: uuid.UUID,
    paper_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> PaperDetailRead:
    """Returns processing status and, once available, the structured parse result."""
    try:
        return await PaperService(session).get_paper(project_id, paper_id, current_user)
    except (ProjectNotFoundError, PaperNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
