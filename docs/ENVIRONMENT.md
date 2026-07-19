# Environment Variable Reference

All settings are defined in [`backend/app/config/settings.py`](../backend/app/config/settings.py)
(a Pydantic `Settings` class) and loaded from `backend/.env` - copy
[`backend/.env.example`](../backend/.env.example) to get started. Every
variable below has a safe development default; **production deployments must
override the secrets** (marked below) or the app refuses to start (see
`APP_ENV` below).

## App

| Variable | Default | Notes |
|---|---|---|
| `APP_NAME` | `Research2Code` | |
| `APP_ENV` | `development` | Set to `production` or `staging` to enable the startup secret-strength check (rejects default `JWT_SECRET_KEY`/`POSTGRES_PASSWORD`/`MINIO_SECRET_KEY`/`NEO4J_PASSWORD`). |
| `DEBUG` | `false` | Enables SQLAlchemy `echo` and FastAPI debug mode. |
| `API_V1_PREFIX` | `/api/v1` | |
| `LOG_LEVEL` | `INFO` | Structured JSON logs (see `app/utils/logger.py`). |

## CORS, rate limiting, security headers

| Variable | Default | Notes |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated. |
| `RATE_LIMIT_ENABLED` | `true` | Redis-backed fixed-window limiter, keyed by client IP/token. |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | |
| `RATE_LIMIT_MAX_REQUESTS` | `120` | Per window, per client. |
| `HSTS_ENABLED` | `false` | Enable only once TLS termination is confirmed (reverse proxy/LB). |

## Observability

| Variable | Default | Notes |
|---|---|---|
| `OTEL_ENABLED` | `false` | Enables OpenTelemetry tracing for FastAPI, SQLAlchemy, Redis, Celery. |
| `OTEL_SERVICE_NAME` | `research2code-api` | |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | _(empty)_ | e.g. an OTel Collector's gRPC endpoint. |
| `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | `5` | Consecutive failures before a breaker opens (LLM/embeddings/MinIO). |
| `CIRCUIT_BREAKER_RECOVERY_SECONDS` | `30` | Time before a half-open trial call. |

Prometheus metrics are always exposed at `GET /metrics` (no auth - put it
behind your scrape network, not the public internet).

## PostgreSQL

| Variable | Default | Notes |
|---|---|---|
| `POSTGRES_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_DB` | see `.env.example` | **Change `_PASSWORD` in production.** |
| `DB_POOL_SIZE` | `10` | Per process (API and each Celery worker have their own pool). |
| `DB_MAX_OVERFLOW` | `10` | |
| `DB_POOL_TIMEOUT_SECONDS` | `30` | |
| `DB_POOL_PRE_PING` | `true` | Detects dropped connections before use. |
| `DB_POOL_RECYCLE_SECONDS` | `1800` | Recycles connections older than this. |

## Redis

| Variable | Default | Notes |
|---|---|---|
| `REDIS_HOST` / `_PORT` / `_DB` / `_PASSWORD` | see `.env.example` | Used for cache, pub/sub, and rate limiting. |
| `REDIS_MAX_CONNECTIONS` | `50` | |
| `REDIS_SOCKET_TIMEOUT_SECONDS` | `5.0` | |
| `REDIS_SOCKET_CONNECT_TIMEOUT_SECONDS` | `5.0` | |
| `CELERY_BROKER_URL` | `redis://localhost:6379/1` | Separate DB index from the cache. |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/2` | |

## Neo4j

| Variable | Default | Notes |
|---|---|---|
| `NEO4J_URI` / `_USER` / `_PASSWORD` | see `.env.example` | **Change `_PASSWORD` in production.** 5.x requires 8+ characters. |
| `NEO4J_CONNECTION_TIMEOUT_SECONDS` | `10.0` | |
| `NEO4J_MAX_CONNECTION_POOL_SIZE` | `50` | |

## MinIO (S3-compatible storage)

| Variable | Default | Notes |
|---|---|---|
| `MINIO_ENDPOINT` / `_ACCESS_KEY` / `_SECRET_KEY` / `_BUCKET` / `_SECURE` | see `.env.example` | **Change `_SECRET_KEY` in production.** |
| `MINIO_CONNECT_TIMEOUT_SECONDS` | `10` | |
| `MINIO_READ_TIMEOUT_SECONDS` | `60` | |

## File uploads

| Variable | Default | Notes |
|---|---|---|
| `MAX_PDF_SIZE_MB` | `50` | Enforced while streaming the upload, not after buffering it. |
| `MAX_IMAGE_SIZE_MB` | `10` | |

## Paper parsing / OCR

| Variable | Default | Notes |
|---|---|---|
| `TESSERACT_CMD` | _(empty)_ | Path to the `tesseract` binary if not on `PATH`. |
| `OCR_MIN_TEXT_LENGTH` | `20` | Below this, a page is treated as scanned and OCR'd. |
| `OCR_RENDER_DPI` | `200` | |
| `OCR_LANGUAGE` | `eng` | |

## LLM (knowledge extraction, RAG, orchestrator agents)

| Variable | Default | Notes |
|---|---|---|
| `LLM_PROVIDER` | `anthropic` | Or `openai`; provider-agnostic via `get_chat_model()`. |
| `LLM_MODEL` | `claude-sonnet-4-5` | |
| `LLM_TEMPERATURE` | `0.0` | |
| `LLM_MAX_INPUT_CHARS` | `60000` | |
| `LLM_REQUEST_TIMEOUT_SECONDS` | `120` | |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | _(empty)_ | **Required secrets** for whichever provider is active. |

## Embeddings

| Variable | Default | Notes |
|---|---|---|
| `EMBEDDING_PROVIDER` | `openai` | Or `local` (deterministic hash - offline dev/test only, no external calls). |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | |
| `EMBEDDING_DIMENSIONS` | `1536` | Baked into the pgvector column at the DB level - changing it needs a migration. |
| `EMBEDDING_BATCH_SIZE` | `64` | |
| `EMBEDDING_REQUEST_TIMEOUT_SECONDS` | `60` | |

## RAG

| Variable | Default | Notes |
|---|---|---|
| `RAG_CONTEXT_TOKEN_BUDGET` | `3000` | |
| `RAG_CACHE_TTL_SECONDS` | `900` | |
| `RAG_RRF_K` | `60` | Reciprocal Rank Fusion constant. |
| `RAG_DEFAULT_LIMIT` | `10` | |

## Execution platform (Docker / MLflow / TensorBoard)

| Variable | Default | Notes |
|---|---|---|
| `DOCKER_HOST` | _(empty)_ | Empty uses the local daemon socket. |
| `EXECUTION_WORK_ROOT` | `/tmp/research2code/executions` | Path as the Celery *worker* sees it. |
| `EXECUTION_HOST_WORK_ROOT` | _(empty)_ | Path as the Docker *daemon* (host) sees the same bind mount - required when the worker itself runs in a container. See the docstring in `settings.py`. |
| `EXECUTION_NETWORK_DISABLED` | `false` | |
| `EXECUTION_CPU_LIMIT` | `2.0` | |
| `EXECUTION_MEMORY_LIMIT_MB` | `4096` | |
| `EXECUTION_TIMEOUT_SECONDS` | `21600` (6h) | |
| `EXECUTION_MONITOR_INTERVAL_SECONDS` | `10` | |
| `EXECUTION_LOG_TAIL_LINES` | `5000` | |
| `MLFLOW_TRACKING_URI` | `http://localhost:5000` | |
| `MLFLOW_S3_ENDPOINT_URL` | _(empty)_ | Points MLflow's artifact store at MinIO. |
| `TENSORBOARD_LOG_ROOT` / `_HOST_LOG_ROOT` | see `.env.example` | Same worker-vs-host distinction as `EXECUTION_*`. |
| `TENSORBOARD_BASE_URL` | `http://localhost:6006` | |

## Auth

| Variable | Default | Notes |
|---|---|---|
| `JWT_SECRET_KEY` | `change-me` | **Must be overridden in production** - the app refuses to start with the default when `APP_ENV=production`/`staging`. |
| `JWT_ALGORITHM` | `HS256` | |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | `7` | |
