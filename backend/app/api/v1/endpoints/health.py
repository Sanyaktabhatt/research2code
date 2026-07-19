import asyncio

from fastapi import APIRouter, Response, status

from app.config.database import check_database_connection
from app.config.neo4j_client import check_neo4j_connection
from app.config.redis_config import check_redis_connection
from app.storage.minio_client import check_minio_connection

router = APIRouter()


@router.get("/health/live")
async def liveness() -> dict:
    """Process-level liveness: is the app running at all? Never touches
    external dependencies, so a dependency outage never causes an
    orchestrator (Kubernetes, etc.) to kill and restart a healthy process."""
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness(response: Response) -> dict:
    """Dependency-level readiness: can this instance actually serve traffic?
    Used by load balancers/orchestrators to gate traffic, not to decide
    whether to restart the process."""
    checks = {"database": check_database_connection, "redis": check_redis_connection}
    optional_checks = {"neo4j": check_neo4j_connection, "minio": check_minio_connection}

    results: dict[str, str] = {}
    healthy = True

    names = list(checks) + list(optional_checks)
    coros = [checks[name]() for name in checks] + [optional_checks[name]() for name in optional_checks]
    outcomes = await asyncio.gather(*coros, return_exceptions=True)

    for name, outcome in zip(names, outcomes):
        if isinstance(outcome, Exception):
            results[name] = f"error: {outcome}"
            if name in checks:  # only core deps (DB/Redis) flip readiness to unhealthy
                healthy = False
        else:
            results[name] = "ok"

    response.status_code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "ok" if healthy else "unhealthy", "checks": results}


@router.get("/health")
async def health_check(response: Response) -> dict:
    """Kept for backwards compatibility with existing monitors; equivalent to /health/ready."""
    return await readiness(response)
