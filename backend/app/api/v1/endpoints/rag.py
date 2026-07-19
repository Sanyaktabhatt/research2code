import uuid

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user, get_current_user_ws
from app.config.database import get_db
from app.models.user import User
from app.schemas.rag import RAGAnswer, RAGQueryRequest, WarmCacheRequest, WarmCacheResponse
from app.services.rag_service import RAGService
from app.utils.exceptions import (
    PaperNotFoundError,
    PaperNotParsedError,
    PermissionDeniedError,
    ProjectNotFoundError,
)

router = APIRouter()


@router.post("/rag/query", response_model=RAGAnswer)
async def query_rag(
    payload: RAGQueryRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> RAGAnswer:
    """Non-streaming RAG turn: retrieval + context building + generation, with citations."""
    return await RAGService(session).answer(payload, current_user)


@router.post(
    "/papers/{paper_id}/rag/warm-cache",
    response_model=WarmCacheResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def warm_rag_cache(
    paper_id: uuid.UUID,
    payload: WarmCacheRequest | None = None,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> WarmCacheResponse:
    """Pre-populates the retrieval cache for a paper (default or caller-supplied queries)."""
    queries = payload.queries if payload else None

    try:
        await RAGService(session).trigger_cache_warm(paper_id, current_user, queries)
    except (ProjectNotFoundError, PaperNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except PaperNotParsedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return WarmCacheResponse(paper_id=paper_id)


@router.websocket("/rag/ws")
async def rag_websocket(
    websocket: WebSocket,
    current_user: User = Depends(get_current_user_ws),
    session: AsyncSession = Depends(get_db),
) -> None:
    """Streams a RAG answer token-by-token, followed by a final citations message.

    Accepts one JSON `RAGQueryRequest` per message and supports multiple
    turns over the same connection - callers manage conversational history
    by including prior turns in `history` on each request.
    """
    await websocket.accept()
    service = RAGService(session)

    try:
        while True:
            data = await websocket.receive_json()

            try:
                request = RAGQueryRequest.model_validate(data)
            except ValidationError as exc:
                await websocket.send_json({"type": "error", "detail": exc.errors()})
                continue

            try:
                stream, context = await service.stream_answer(request, current_user)
            except Exception as exc:  # noqa: BLE001 - reported to the client, connection stays open
                await websocket.send_json({"type": "error", "detail": str(exc)})
                continue

            async for delta in stream:
                await websocket.send_json({"type": "token", "content": delta})

            await websocket.send_json(
                {
                    "type": "done",
                    "citations": [citation.model_dump(mode="json") for citation in context.citations],
                }
            )
    except WebSocketDisconnect:
        pass
