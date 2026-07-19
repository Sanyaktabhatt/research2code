"""OpenTelemetry tracing setup, enabled via `OTEL_ENABLED`.

Disabled by default so local/dev environments (and CI) don't need a
collector running; set `OTEL_ENABLED=true` and `OTEL_EXPORTER_OTLP_ENDPOINT`
to export real traces (e.g. to an OTel Collector, Tempo, or Jaeger).
"""

from fastapi import FastAPI

from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

_instrumented = False


def setup_tracing(app: FastAPI) -> None:
    global _instrumented
    if not settings.OTEL_ENABLED or _instrumented:
        return

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.celery import CeleryInstrumentor
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.redis import RedisInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
    from opentelemetry.sdk.resources import SERVICE_NAME, Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    resource = Resource.create({SERVICE_NAME: settings.OTEL_SERVICE_NAME})
    provider = TracerProvider(resource=resource)

    if settings.OTEL_EXPORTER_OTLP_ENDPOINT:
        exporter = OTLPSpanExporter(endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT)
        provider.add_span_processor(BatchSpanProcessor(exporter))

    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument()
    RedisInstrumentor().instrument()
    CeleryInstrumentor().instrument()

    _instrumented = True
    logger.info("OpenTelemetry tracing enabled", extra={"service_name": settings.OTEL_SERVICE_NAME})


def setup_celery_tracing() -> None:
    """Celery-worker-side entrypoint (no FastAPI app to instrument there)."""
    global _instrumented
    if not settings.OTEL_ENABLED or _instrumented:
        return

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.celery import CeleryInstrumentor
    from opentelemetry.sdk.resources import SERVICE_NAME, Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    resource = Resource.create({SERVICE_NAME: "research2code-worker"})
    provider = TracerProvider(resource=resource)

    if settings.OTEL_EXPORTER_OTLP_ENDPOINT:
        exporter = OTLPSpanExporter(endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT)
        provider.add_span_processor(BatchSpanProcessor(exporter))

    trace.set_tracer_provider(provider)
    CeleryInstrumentor().instrument()

    _instrumented = True
