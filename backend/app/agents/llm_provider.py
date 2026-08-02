import time
from typing import Any

from langchain.chat_models import init_chat_model

from app.config.settings import settings
from app.observability.metrics import llm_request_duration_seconds, llm_request_total
from app.utils.circuit_breaker import CircuitBreaker

_API_KEYS_BY_PROVIDER = {
    "anthropic": lambda: settings.ANTHROPIC_API_KEY,
    "openai": lambda: settings.OPENAI_API_KEY,
    "google_genai": lambda: settings.GOOGLE_API_KEY,
    "gemini": lambda: settings.GOOGLE_API_KEY,
    "openrouter": lambda: settings.OPENROUTER_API_KEY,
}
# OpenRouter speaks the OpenAI API (different base URL, model catalog, and
# key), so it rides LangChain's "openai" provider rather than needing its own
# SDK integration - `_extra_kwargs_by_provider` below is what actually points
# it at OpenRouter instead of api.openai.com.
_PROVIDER_ALIASES = {"gemini": "google_genai", "openrouter": "openai"}
_EXTRA_KWARGS_BY_PROVIDER = {
    "openrouter": lambda: {"base_url": settings.OPENROUTER_BASE_URL},
}

# One breaker per provider: a string of failures against Anthropic shouldn't
# also fail fast against an OpenAI-backed call in the same process.
_breakers: dict[str, CircuitBreaker] = {}


def _get_breaker(provider: str) -> CircuitBreaker:
    if provider not in _breakers:
        _breakers[provider] = CircuitBreaker(
            name=f"llm:{provider}",
            failure_threshold=settings.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
            recovery_seconds=settings.CIRCUIT_BREAKER_RECOVERY_SECONDS,
        )
    return _breakers[provider]


class ResilientChatModel:
    """Duck-typed proxy around a `BaseChatModel` (or any Runnable derived
    from one via `with_structured_output`) that routes every `invoke`/
    `ainvoke` through a per-provider circuit breaker and records Prometheus
    latency/outcome metrics.

    Deliberately not a `Runnable` subclass - it only implements the handful
    of methods every agent in this codebase actually calls, so it's a
    drop-in replacement for the model `get_chat_model` used to return
    directly, with no call-site changes required anywhere else.
    """

    def __init__(self, inner: Any, breaker: CircuitBreaker, provider: str) -> None:
        self._inner = inner
        self._breaker = breaker
        self._provider = provider

    def invoke(self, *args: Any, **kwargs: Any) -> Any:
        start = time.perf_counter()
        try:
            result = self._breaker.call(self._inner.invoke, *args, **kwargs)
        except Exception:
            llm_request_total.labels(provider=self._provider, outcome="failure").inc()
            raise
        llm_request_duration_seconds.labels(provider=self._provider).observe(time.perf_counter() - start)
        llm_request_total.labels(provider=self._provider, outcome="success").inc()
        return result

    async def ainvoke(self, *args: Any, **kwargs: Any) -> Any:
        start = time.perf_counter()
        try:
            result = await self._breaker.acall(self._inner.ainvoke, *args, **kwargs)
        except Exception:
            llm_request_total.labels(provider=self._provider, outcome="failure").inc()
            raise
        llm_request_duration_seconds.labels(provider=self._provider).observe(time.perf_counter() - start)
        llm_request_total.labels(provider=self._provider, outcome="success").inc()
        return result

    def with_structured_output(self, *args: Any, **kwargs: Any) -> "ResilientChatModel":
        return ResilientChatModel(
            self._inner.with_structured_output(*args, **kwargs), self._breaker, self._provider
        )

    def __getattr__(self, name: str) -> Any:
        return getattr(self._inner, name)


def get_chat_model(
    provider: str | None = None,
    model: str | None = None,
    temperature: float | None = None,
) -> ResilientChatModel:
    """Provider-agnostic chat model factory.

    Swapping LLM providers (Anthropic, OpenAI, etc.) is a matter of changing
    `LLM_PROVIDER`/`LLM_MODEL` in settings (or passing overrides here) -
    nothing else in the extraction pipeline depends on a specific vendor SDK.
    """
    requested_provider = provider or settings.LLM_PROVIDER
    # Only the *lookalike* alias (openrouter/gemini -> the LangChain
    # provider id that actually speaks their API shape) goes through this -
    # the API key and any provider-specific kwargs must stay keyed by
    # `requested_provider`, since e.g. openrouter's key/base_url are not
    # openai's despite resolving to the same LangChain integration.
    resolved_provider = _PROVIDER_ALIASES.get(requested_provider, requested_provider)
    resolved_model = model or settings.LLM_MODEL

    kwargs: dict[str, Any] = {
        "temperature": settings.LLM_TEMPERATURE if temperature is None else temperature,
        "timeout": settings.LLM_REQUEST_TIMEOUT_SECONDS,
        "max_tokens": settings.LLM_MAX_OUTPUT_TOKENS,
    }

    # Only pass api_key when we actually have one; omitting it lets the
    # underlying provider SDK fall back to its own env-var lookup
    # (ANTHROPIC_API_KEY / OPENAI_API_KEY) instead of failing on an
    # explicit None.
    api_key_getter = _API_KEYS_BY_PROVIDER.get(requested_provider)
    api_key = api_key_getter() if api_key_getter else None
    if api_key:
        kwargs["api_key"] = api_key

    extra_kwargs_getter = _EXTRA_KWARGS_BY_PROVIDER.get(requested_provider)
    if extra_kwargs_getter:
        kwargs.update(extra_kwargs_getter())

    chat_model = init_chat_model(model=resolved_model, model_provider=resolved_provider, **kwargs)
    return ResilientChatModel(chat_model, _get_breaker(requested_provider), requested_provider)
