from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "Research2Code"
    APP_ENV: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Logging
    LOG_LEVEL: str = "INFO"

    # CORS
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    # Rate limiting (fixed window, per client IP/token, backed by Redis so it
    # holds across multiple API replicas)
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_MAX_REQUESTS: int = 120

    # TLS termination is expected to happen at a reverse proxy/load balancer
    # in production; enable HSTS only once that's confirmed, to avoid locking
    # out plain-HTTP local/staging access.
    HSTS_ENABLED: bool = False

    # OpenTelemetry tracing
    OTEL_ENABLED: bool = False
    OTEL_SERVICE_NAME: str = "research2code-api"
    OTEL_EXPORTER_OTLP_ENDPOINT: str | None = None

    # Circuit breakers around external services (LLM providers, Neo4j, MinIO)
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 5
    CIRCUIT_BREAKER_RECOVERY_SECONDS: int = 30

    # PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "research2code"

    # Connection pool sizing - defaults suit a single API replica; tune
    # alongside worker concurrency in a real deployment.
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT_SECONDS: int = 30
    DB_POOL_PRE_PING: bool = True
    DB_POOL_RECYCLE_SECONDS: int = 1800

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def SYNC_DATABASE_URL(self) -> str:
        """Used by Celery workers, which run outside the asyncio event loop."""
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str | None = None
    REDIS_MAX_CONNECTIONS: int = 50
    REDIS_SOCKET_TIMEOUT_SECONDS: float = 5.0
    REDIS_SOCKET_CONNECT_TIMEOUT_SECONDS: float = 5.0

    @property
    def REDIS_URL(self) -> str:
        auth = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Neo4j (5.x requires an 8+ character password)
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "neo4jpassword"
    NEO4J_CONNECTION_TIMEOUT_SECONDS: float = 10.0
    NEO4J_MAX_CONNECTION_POOL_SIZE: int = 50

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "research2code"
    MINIO_SECURE: bool = False
    MINIO_CONNECT_TIMEOUT_SECONDS: int = 10
    MINIO_READ_TIMEOUT_SECONDS: int = 60

    # File uploads
    MAX_PDF_SIZE_MB: int = 50
    MAX_IMAGE_SIZE_MB: int = 10

    # Paper parsing / OCR
    TESSERACT_CMD: str | None = None
    OCR_MIN_TEXT_LENGTH: int = 20
    OCR_RENDER_DPI: int = 200
    OCR_LANGUAGE: str = "eng"

    # Knowledge extraction LLM
    LLM_PROVIDER: str = "anthropic"
    LLM_MODEL: str = "claude-sonnet-4-5"
    LLM_TEMPERATURE: float = 0.0
    LLM_MAX_INPUT_CHARS: int = 60000
    LLM_REQUEST_TIMEOUT_SECONDS: int = 120
    ANTHROPIC_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None

    # Embeddings
    EMBEDDING_PROVIDER: str = "openai"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536
    EMBEDDING_BATCH_SIZE: int = 64
    EMBEDDING_REQUEST_TIMEOUT_SECONDS: int = 60

    # RAG
    RAG_CONTEXT_TOKEN_BUDGET: int = 3000
    RAG_CACHE_TTL_SECONDS: int = 900
    RAG_RRF_K: int = 60
    RAG_DEFAULT_LIMIT: int = 10

    # Execution platform - Docker
    #
    # The Celery worker talks to the Docker daemon over its socket to launch
    # *sibling* containers (Docker-outside-of-Docker) - it does not run
    # training inside itself. That means every bind-mount source path must be
    # a path the *daemon* (i.e. the host) can resolve, which is not
    # necessarily the same path the worker process itself sees if the worker
    # is itself running inside a container. `EXECUTION_WORK_ROOT`/
    # `TENSORBOARD_LOG_ROOT` are the paths the worker uses for its own file
    # I/O (extracting projects, etc). The `*_HOST_*` variants are what's
    # passed to the Docker daemon when mounting those same directories into a
    # new sibling container; they default to the worker-side path, which is
    # correct when the worker runs directly on the host (bare metal/VM). When
    # the worker itself runs in a container (e.g. our own docker-compose
    # setup), these must be set to the real host path backing that bind mount.
    DOCKER_HOST: str | None = None  # None = use the local Docker daemon/socket
    EXECUTION_WORK_ROOT: str = "/tmp/research2code/executions"
    EXECUTION_HOST_WORK_ROOT: str | None = None
    EXECUTION_NETWORK_DISABLED: bool = False
    EXECUTION_CPU_LIMIT: float = 2.0
    EXECUTION_MEMORY_LIMIT_MB: int = 4096
    EXECUTION_TIMEOUT_SECONDS: int = 6 * 3600
    EXECUTION_MONITOR_INTERVAL_SECONDS: int = 10
    EXECUTION_LOG_TAIL_LINES: int = 5000

    @property
    def execution_host_work_root(self) -> str:
        return self.EXECUTION_HOST_WORK_ROOT or self.EXECUTION_WORK_ROOT

    # Execution platform - MLflow
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"
    MLFLOW_S3_ENDPOINT_URL: str | None = None

    # Execution platform - TensorBoard
    TENSORBOARD_LOG_ROOT: str = "/tmp/research2code/tensorboard_logs"
    TENSORBOARD_HOST_LOG_ROOT: str | None = None
    TENSORBOARD_BASE_URL: str = "http://localhost:6006"

    @property
    def tensorboard_host_log_root(self) -> str:
        return self.TENSORBOARD_HOST_LOG_ROOT or self.TENSORBOARD_LOG_ROOT

    # Auth
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @model_validator(mode="after")
    def _reject_insecure_defaults_outside_development(self) -> "Settings":
        if self.APP_ENV.lower() in ("production", "staging"):
            insecure_defaults = {
                "JWT_SECRET_KEY": self.JWT_SECRET_KEY == "change-me",  # noqa: S105
                "POSTGRES_PASSWORD": self.POSTGRES_PASSWORD == "postgres",  # noqa: S105
                "MINIO_SECRET_KEY": self.MINIO_SECRET_KEY == "minioadmin",  # noqa: S105
                "NEO4J_PASSWORD": self.NEO4J_PASSWORD == "neo4jpassword",  # noqa: S105
            }
            offending = [name for name, is_default in insecure_defaults.items() if is_default]
            if offending:
                raise ValueError(
                    f"Refusing to start with APP_ENV={self.APP_ENV!r} while still using "
                    f"insecure default values for: {', '.join(offending)}. "
                    "Set real secrets via environment variables."
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
