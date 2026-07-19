from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user, get_current_user_ws
from app.config.database import get_db
from app.models.user import User
from app.schemas.orchestrator import OrchestratorAnswer, OrchestratorQueryRequest
from app.services.orchestrator_service import OrchestratorService

router = APIRouter()


@router.post("/orchestrator/query", response_model=OrchestratorAnswer)
async def query_orchestrator(
    payload: OrchestratorQueryRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db),
) -> OrchestratorAnswer:
    """Every user request goes through the multi-agent orchestrator: the
    Planner decides which specialist agents run, and only the final,
    reviewed answer (plus citations) is returned - no intermediate
    reasoning is exposed.
    """
    return await OrchestratorService(session).run(payload, current_user)


@router.websocket("/orchestrator/ws")
async def orchestrator_websocket(
    websocket: WebSocket,
    current_user: User = Depends(get_current_user_ws),
    session: AsyncSession = Depends(get_db),
) -> None:
    """Streams the orchestrator's final answer token-by-token, followed by a
    citations message. Accepts one JSON `OrchestratorQueryRequest` per
    message and supports multiple turns per connection - callers manage
    conversational history by including prior turns in `history`.
    """
    await websocket.accept()
    service = OrchestratorService(session)

    try:
        while True:
            data = await websocket.receive_json()

            try:
                request = OrchestratorQueryRequest.model_validate(data)
            except ValidationError as exc:
                await websocket.send_json({"type": "error", "detail": exc.errors()})
                continue

            try:
                stream, citations, generated_project = await service.stream(request, current_user)
            except Exception as exc:  # noqa: BLE001 - reported to the client, connection stays open
                await websocket.send_json({"type": "error", "detail": str(exc)})
                continue

            async for delta in stream:
                await websocket.send_json({"type": "token", "content": delta})

            await websocket.send_json(
                {
                    "type": "done",
                    "citations": [citation.model_dump(mode="json") for citation in citations],
                    "generated_project": generated_project.model_dump(mode="json")
                    if generated_project
                    else None,
                }
            )
    except WebSocketDisconnect:
        pass
