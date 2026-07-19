import hashlib
import struct
from abc import ABC, abstractmethod

from app.config.settings import settings
from app.observability.metrics import observe_duration, embedding_request_duration_seconds
from app.utils.circuit_breaker import CircuitBreaker

_embedding_breaker = CircuitBreaker(
    name="embeddings",
    failure_threshold=settings.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    recovery_seconds=settings.CIRCUIT_BREAKER_RECOVERY_SECONDS,
)


class EmbeddingProvider(ABC):
    """Common interface every embedding backend must implement.

    Swapping providers (OpenAI, a local model, etc.) only requires adding a
    class here and a branch in `get_embedding_provider` - nothing else in
    the indexing pipeline depends on a specific vendor SDK.
    """

    provider_name: str
    model_name: str
    dimensions: int

    @abstractmethod
    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    @abstractmethod
    def embed_query(self, text: str) -> list[float]: ...


class OpenAIEmbeddingProvider(EmbeddingProvider):
    def __init__(self, model: str, api_key: str | None, dimensions: int) -> None:
        from langchain_openai import OpenAIEmbeddings

        self.provider_name = "openai"
        self.model_name = model
        self.dimensions = dimensions

        kwargs: dict[str, object] = {
            "model": model,
            "dimensions": dimensions,
            "timeout": settings.EMBEDDING_REQUEST_TIMEOUT_SECONDS,
        }
        if api_key:
            kwargs["api_key"] = api_key
        self._client = OpenAIEmbeddings(**kwargs)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        with observe_duration(embedding_request_duration_seconds, provider=self.provider_name):
            return _embedding_breaker.call(self._client.embed_documents, texts)

    def embed_query(self, text: str) -> list[float]:
        with observe_duration(embedding_request_duration_seconds, provider=self.provider_name):
            return _embedding_breaker.call(self._client.embed_query, text)


class DeterministicHashEmbeddingProvider(EmbeddingProvider):
    """Offline, dependency-free embedding provider for local dev/testing.

    Produces a stable pseudo-embedding derived from a SHA-256 hash of the
    text. It carries no semantic meaning - it exists so the indexing
    pipeline, storage, and similarity search can be exercised end-to-end
    without a real embedding API key.
    """

    def __init__(self, dimensions: int) -> None:
        self.provider_name = "local"
        self.model_name = "deterministic-hash-v1"
        self.dimensions = dimensions

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)

    def _embed(self, text: str) -> list[float]:
        vector: list[float] = []
        seed = text.encode("utf-8")
        counter = 0

        while len(vector) < self.dimensions:
            digest = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
            for offset in range(0, len(digest), 4):
                if len(vector) >= self.dimensions:
                    break
                (value,) = struct.unpack(">I", digest[offset : offset + 4])
                vector.append((value / 0xFFFFFFFF) * 2 - 1)
            counter += 1

        return vector


def get_embedding_provider() -> EmbeddingProvider:
    if settings.EMBEDDING_PROVIDER == "openai":
        return OpenAIEmbeddingProvider(
            model=settings.EMBEDDING_MODEL,
            api_key=settings.OPENAI_API_KEY,
            dimensions=settings.EMBEDDING_DIMENSIONS,
        )
    if settings.EMBEDDING_PROVIDER == "local":
        return DeterministicHashEmbeddingProvider(dimensions=settings.EMBEDDING_DIMENSIONS)

    raise ValueError(f"Unsupported embedding provider: {settings.EMBEDDING_PROVIDER}")
