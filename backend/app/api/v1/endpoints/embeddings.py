import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.config.database import get_db
from app.models.user import User
from app.schemas.embedding import (
    EmbeddingIndexTriggerResponse,
    EmbeddingSearchRequest,
    EmbeddingSearchResult,
    EmbeddingStatusResponse,
)
from app.services.embedding_service import EmbeddingService
from app.utils.exceptions import (
    PaperNotFoundError,
    PaperNotParsedError,
    PermissionDeniedError,
    ProjectNotFoundError,
)

router = APIRouter()


@router.post(
    "/papers/{paper_id}/embeddings",
    response_model=EmbeddingIndexTriggerResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_paper_embeddings(
    paper_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> EmbeddingIndexTriggerResponse:
    """Queues (re)generation of embeddings for a paper's sections, figures, tables and equations."""
    try:
        await EmbeddingService(session).trigger_paper_embeddings(paper_id, current_user)
    except (ProjectNotFoundError, PaperNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except PaperNotParsedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return EmbeddingIndexTriggerResponse(paper_id=paper_id)


@router.get("/papers/{paper_id}/embeddings/status", response_model=EmbeddingStatusResponse)
async def get_paper_embedding_status(
    paper_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> EmbeddingStatusResponse:
    """Whether embedding generation has produced any vectors yet - powers
    the project workspace's pipeline tracker "Embedding Generation" /
    "RAG Ready" stages."""
    try:
        return await EmbeddingService(session).get_status(paper_id, current_user)
    except (ProjectNotFoundError, PaperNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/embeddings/search", response_model=list[EmbeddingSearchResult])
async def search_embeddings(
    payload: EmbeddingSearchRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> list[EmbeddingSearchResult]:
    """Cosine-similarity search over embeddings, scoped to papers the caller can access."""
    return await EmbeddingService(session).search(
        query=payload.query,
        owner=current_user,
        source_types=payload.source_types,
        paper_id=payload.paper_id,
        limit=payload.limit,
    )
