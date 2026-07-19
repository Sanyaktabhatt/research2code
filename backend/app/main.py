from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_router
from app.config.database import dispose_database_engine
from app.config.neo4j_client import close_neo4j_driver
from app.config.redis_config import close_redis_connections
from app.config.settings import settings
from app.middleware.correlation_id import CorrelationIdMiddleware
from app.middleware.metrics import MetricsMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.observability.metrics import refresh_celery_queue_depths, render_latest
from app.observability.tracing import setup_tracing
from app.utils.logger import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup")
    yield
    logger.info("Application shutdown: closing connection pools")
    # Order doesn't matter between these three - they're independent pools -
    # but all must finish before the process actually exits so in-flight
    # requests/queries get a chance to complete rather than being severed.
    await dispose_database_engine()
    await close_redis_connections()
    await close_neo4j_driver()


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Order matters: Starlette makes the *last*-added middleware the *outermost*
# one (it runs first on the way in, last on the way out). Correlation ID is
# added last so every other middleware's log lines carry a request ID; CORS
# is added right after it so CORS headers still land on responses that
# RateLimitMiddleware/SecurityHeadersMiddleware short-circuit (e.g. a 429).
app.add_middleware(MetricsMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware, hsts_enabled=settings.HSTS_ENABLED)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CorrelationIdMiddleware)

setup_tracing(app)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Never leak internal exception details (stack traces, file paths, driver
    # errors) to clients - log the full context server-side, keyed by the
    # request's correlation ID, and return a generic message.
    request_id = getattr(request.state, "request_id", None)
    logger.exception("Unhandled exception", extra={"request_id": request_id})
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/metrics")
async def metrics() -> Response:
    await refresh_celery_queue_depths()
    body, content_type = render_latest()
    return Response(content=body, media_type=content_type)


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
