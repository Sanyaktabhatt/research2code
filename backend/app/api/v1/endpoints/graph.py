import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.config.database import get_db
from app.models.user import User
from app.schemas.graph import GraphRebuildResponse, GraphSnapshotResponse
from app.services.graph_service import GraphService
from app.utils.exceptions import (
    KnowledgeExtractionNotCompletedError,
    KnowledgeExtractionNotFoundError,
    PaperNotFoundError,
    PermissionDeniedError,
    ProjectNotFoundError,
)

router = APIRouter()

_NOT_FOUND_ERRORS = (ProjectNotFoundError, PaperNotFoundError, KnowledgeExtractionNotFoundError)


@router.get("/papers/{paper_id}/graph", response_model=GraphSnapshotResponse)
async def get_paper_graph(
    paper_id: uuid.UUID,
    version: int | None = Query(default=None, ge=1, description="Extraction version; defaults to latest"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> GraphSnapshotResponse:
    """Queries the knowledge-graph snapshot for one extraction version - independent of vector search."""
    try:
        return await GraphService(session).get_paper_graph(paper_id, current_user, version)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except KnowledgeExtractionNotCompletedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post(
    "/knowledge-extractions/{extraction_id}/graph/rebuild",
    response_model=GraphRebuildResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def rebuild_extraction_graph(
    extraction_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> GraphRebuildResponse:
    """Manually (re)builds the graph snapshot for one extraction version."""
    try:
        extraction = await GraphService(session).trigger_build(extraction_id, current_user)
    except _NOT_FOUND_ERRORS as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except KnowledgeExtractionNotCompletedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return GraphRebuildResponse(paper_id=extraction.paper_id, knowledge_extraction_id=extraction.id)
