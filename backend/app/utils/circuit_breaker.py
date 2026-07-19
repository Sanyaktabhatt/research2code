import threading
import time
from collections.abc import Awaitable, Callable
from enum import Enum
from typing import ParamSpec, TypeVar

from app.utils.logger import get_logger

logger = get_logger(__name__)

P = ParamSpec("P")
R = TypeVar("R")


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitOpenError(Exception):
    """Raised instead of calling through when the breaker is open."""

    def __init__(self, name: str) -> None:
        self.name = name
        super().__init__(f"Circuit breaker '{name}' is open - refusing call")


class CircuitBreaker:
    """A minimal thread-safe circuit breaker for wrapping calls to external
    services (LLM providers, Neo4j, MinIO, ...). Used identically from both
    the async FastAPI request path and synchronous Celery tasks, so state is
    guarded with a plain `threading.Lock` rather than an asyncio-only
    primitive.

    After `failure_threshold` consecutive failures the breaker opens and
    fails fast for `recovery_seconds`; it then allows one trial call
    (half-open) to decide whether to close again or re-open.
    """

    def __init__(self, name: str, failure_threshold: int, recovery_seconds: float) -> None:
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_seconds = recovery_seconds
        self._lock = threading.Lock()
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._opened_at: float | None = None

    def _before_call(self) -> None:
        with self._lock:
            if self._state == CircuitState.OPEN:
                if self._opened_at is not None and time.monotonic() - self._opened_at >= self.recovery_seconds:
                    self._state = CircuitState.HALF_OPEN
                else:
                    raise CircuitOpenError(self.name)

    def _on_success(self) -> None:
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._opened_at = None

    def _on_failure(self) -> None:
        with self._lock:
            self._failure_count += 1
            if self._state == CircuitState.HALF_OPEN or self._failure_count >= self.failure_threshold:
                self._state = CircuitState.OPEN
                self._opened_at = time.monotonic()
                logger.warning(
                    "Circuit breaker opened",
                    extra={"circuit_breaker": self.name, "failure_count": self._failure_count},
                )

    def call(self, func: Callable[P, R], *args: P.args, **kwargs: P.kwargs) -> R:
        self._before_call()
        try:
            result = func(*args, **kwargs)
        except Exception:
            self._on_failure()
            raise
        self._on_success()
        return result

    async def acall(self, func: Callable[P, Awaitable[R]], *args: P.args, **kwargs: P.kwargs) -> R:
        self._before_call()
        try:
            result = await func(*args, **kwargs)
        except Exception:
            self._on_failure()
            raise
        self._on_success()
        return result

    @property
    def state(self) -> CircuitState:
        return self._state
