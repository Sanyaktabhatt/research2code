"""Request-scoped correlation ID, shared by the FastAPI request path and
Celery tasks (which set it explicitly from a passed-through header/kwarg)."""

from contextvars import ContextVar

_request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


def set_request_id(request_id: str | None) -> None:
    _request_id_ctx.set(request_id)


def get_request_id() -> str | None:
    return _request_id_ctx.get()
