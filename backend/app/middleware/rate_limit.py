import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config.redis_config import redis_client
from app.config.settings import settings

# Health/metrics endpoints are polled frequently by infrastructure
# (load balancers, Prometheus, Kubernetes probes) and carry no abuse risk.
# Health lives under the versioned API prefix; metrics/docs do not.
_EXEMPT_PATH_PREFIXES = (
    f"{settings.API_V1_PREFIX}/health",
    "/metrics",
    "/docs",
    "/redoc",
    "/openapi.json",
)

_RATE_LIMIT_LUA = """
local current = redis.call("INCR", KEYS[1])
if current == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return current
"""


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window rate limiter keyed by client IP (or authenticated user,
    once resolved downstream) using Redis as the shared counter store so
    limits hold across multiple API replicas, not just one process."""

    def __init__(self, app) -> None:
        super().__init__(app)
        self._script = redis_client.register_script(_RATE_LIMIT_LUA)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not settings.RATE_LIMIT_ENABLED or any(
            request.url.path.startswith(prefix) for prefix in _EXEMPT_PATH_PREFIXES
        ):
            return await call_next(request)

        client_key = request.headers.get("Authorization") or (
            request.client.host if request.client else "unknown"
        )
        window = int(time.time()) // settings.RATE_LIMIT_WINDOW_SECONDS
        redis_key = f"ratelimit:{window}:{client_key}"

        try:
            count = await self._script(keys=[redis_key], args=[settings.RATE_LIMIT_WINDOW_SECONDS])
        except Exception:  # noqa: BLE001 - Redis outage must not take down the API
            return await call_next(request)

        if count > settings.RATE_LIMIT_MAX_REQUESTS:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please retry later."},
                headers={"Retry-After": str(settings.RATE_LIMIT_WINDOW_SECONDS)},
            )

        return await call_next(request)
