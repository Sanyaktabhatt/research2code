import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.config.database import get_db
from app.models.user import User
from app.schemas.knowledge import KnowledgeExtractionDetailRead, KnowledgeExtractionRead
from app.services.knowledge_service import KnowledgeExtractionService
from app.utils.exceptions import (
    KnowledgeExtractionNotFoundError,
    PaperNotFoundError,
    PaperNotParsedError,
    PermissionDeniedError,
    ProjectNotFoundError,
)

router = APIRouter()

_NOT_FOUND_ERRORS = (ProjectNotFoundError, PaperNotFoundError, KnowledgeExtractionNotFoundError)


@router.post(
    "/papers/{paper_id}/knowledge-extractions",
    response_model=KnowledgeExtractionRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_knowledge_extraction(
    paper_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> KnowledgeExtractionRead:
    """Queues a new knowledge-extraction run (a new version) for a parsed paper."""
    try:
        return await KnowledgeExtractionService(session).trigger_extraction(paper_id, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except PaperNotParsedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get(
    "/papers/{paper_id}/knowledge-extractions",
    response_model=list[KnowledgeExtractionRead],
)
async def list_knowledge_extractions(
    paper_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> list[KnowledgeExtractionRead]:
    try:
        return await KnowledgeExtractionService(session).list_versions(paper_id, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get(
    "/papers/{paper_id}/knowledge-extractions/latest",
    response_model=KnowledgeExtractionDetailRead,
)
async def get_latest_knowledge_extraction(
    paper_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> KnowledgeExtractionDetailRead:
    try:
        return await KnowledgeExtractionService(session).get_latest(paper_id, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get(
    "/papers/{paper_id}/knowledge-extractions/{version}",
    response_model=KnowledgeExtractionDetailRead,
)
async def get_knowledge_extraction_version(
    paper_id: uuid.UUID,
    version: int,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> KnowledgeExtractionDetailRead:
    try:
        return await KnowledgeExtractionService(session).get_version(paper_id, version, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
