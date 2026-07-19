import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.observability.metrics import http_request_duration_seconds, http_requests_total


class MetricsMiddleware(BaseHTTPMiddleware):
    """Records per-route HTTP request count/latency for Prometheus.

    Uses the matched route template (`request.scope["route"].path`) rather
    than the raw URL path, so `/papers/{id}` from 10,000 distinct papers
    collapses into a single Prometheus label instead of exploding cardinality.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start

        route = request.scope.get("route")
        path = route.path if route is not None else request.url.path

        http_requests_total.labels(
            method=request.method, path=path, status_code=str(response.status_code)
        ).inc()
        http_request_duration_seconds.labels(method=request.method, path=path).observe(duration)

        return response
