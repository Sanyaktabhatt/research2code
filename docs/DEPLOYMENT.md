# Deployment Guide

## Prerequisites

- Docker + Docker Compose (or a Kubernetes cluster - see "Beyond Compose" below)
- A Docker daemon socket reachable from wherever the Celery worker runs (the
  execution platform launches training runs as *sibling* containers)
- PostgreSQL 16+ with the `pgvector` extension available
- An Anthropic and/or OpenAI API key (knowledge extraction, RAG, orchestrator agents)

## Quick start (Docker Compose)

```bash
cd backend
cp .env.example .env
# edit .env: set real secrets (JWT_SECRET_KEY, POSTGRES_PASSWORD, MINIO_SECRET_KEY,
# NEO4J_PASSWORD) and at least one of ANTHROPIC_API_KEY / OPENAI_API_KEY

docker compose up -d postgres redis minio neo4j mlflow tensorboard
docker compose run --rm api alembic upgrade head
docker compose up -d api celery_worker
```

The `mlflow` service needs its MinIO bucket to exist before it can write
artifacts - trigger any request against `api` (e.g. `GET /health/ready`) once
before running a training execution, since the bucket is created lazily on
first MinIO access. See the comment in `docker-compose.yml`.

Verify:

```bash
curl http://localhost:8000/api/v1/health/ready
curl http://localhost:8000/metrics | head
```

## Production checklist

1. **Secrets** - override `JWT_SECRET_KEY`, `POSTGRES_PASSWORD`,
   `MINIO_SECRET_KEY`, `NEO4J_PASSWORD` with real, unique values. Set
   `APP_ENV=production`; the app refuses to start with any of these still at
   their default value in that mode (see `Settings._reject_insecure_defaults_outside_development`).
2. **TLS** - terminate TLS at a reverse proxy/load balancer in front of the
   `api` service; then set `HSTS_ENABLED=true`.
3. **CORS** - set `CORS_ALLOWED_ORIGINS` to your actual frontend origin(s), not `*`.
4. **Migrations** - run `alembic upgrade head` as a release step, before
   rolling out new API/worker versions. CI verifies migrations apply cleanly
   against a fresh database on every PR (see `.github/workflows/ci.yml`).
5. **Docker-outside-of-Docker paths** - if `celery_worker` itself runs in a
   container, set `EXECUTION_HOST_WORK_ROOT` / `TENSORBOARD_HOST_LOG_ROOT` to
   the *host's* absolute paths backing the corresponding bind mounts (already
   wired via `${PWD}` in `docker-compose.yml`). Getting this wrong causes the
   Docker daemon to mount an empty/wrong directory into training containers.
6. **Resource limits** - size `EXECUTION_CPU_LIMIT` / `EXECUTION_MEMORY_LIMIT_MB`
   to what the host running training containers can actually provide, and run
   the `execution` Celery queue on a worker pool sized to that host's
   capacity, separate from the lightweight queues (see `celery_config.py`).
7. **Observability** - point Prometheus at `GET /metrics` on the `api`
   service; set `OTEL_ENABLED=true` + `OTEL_EXPORTER_OTLP_ENDPOINT` if you run
   an OTel Collector/Tempo/Jaeger.
8. **Rate limiting** - `RATE_LIMIT_MAX_REQUESTS`/`RATE_LIMIT_WINDOW_SECONDS`
   default to a single-replica-friendly value; tune for your expected traffic
   (the limiter is Redis-backed, so it holds correctly across replicas).

## Health checks

- `GET /health/live` - process liveness only, never touches dependencies.
  Use for orchestrator restart decisions.
- `GET /health/ready` - checks Postgres/Redis (required) and Neo4j/MinIO
  (best-effort). Use to gate load-balancer traffic.

## Graceful shutdown

The API's FastAPI `lifespan` disposes the DB engine and closes the Redis/Neo4j
connections on shutdown. Send `SIGTERM` (not `SIGKILL`) and allow a grace
period for in-flight requests to finish. Celery workers should be stopped
with `celery -A app.config.celery_config.celery_app control shutdown` or a
`SIGTERM`/warm shutdown so `task_acks_late` can redeliver any in-flight task.

## Beyond Compose

Every execution/storage/LLM/embedding backend in this codebase is defined
behind an abstract interface (`ExecutionBackend`, `ProjectExporter`,
`EmbeddingProvider`) specifically so a Kubernetes Job runner, a managed
object store, or a different LLM vendor can be swapped in without touching
calling code - implement the interface and wire it into the relevant
`get_*`/service constructor.
