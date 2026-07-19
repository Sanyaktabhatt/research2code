"""Prometheus metrics, scraped from `/metrics` (see `app/main.py`).

Every histogram here uses second-denominated buckets suitable for its own
scale (sub-second HTTP responses vs. multi-hour training executions) so
Grafana percentile queries stay meaningful without per-panel bucket tuning.
"""

import time
from contextlib import contextmanager

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests handled",
    ["method", "path", "status_code"],
)
http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30),
)

celery_task_duration_seconds = Histogram(
    "celery_task_duration_seconds",
    "Celery task execution latency",
    ["task_name"],
    buckets=(0.5, 1, 5, 15, 30, 60, 300, 900, 3600, 14400),
)
celery_task_total = Counter(
    "celery_task_total",
    "Total Celery task executions",
    ["task_name", "outcome"],  # outcome: success | failure | retry | ...
)
celery_queue_depth = Gauge(
    "celery_queue_depth",
    "Approximate number of tasks waiting in a Celery queue",
    ["queue"],
)

execution_run_duration_seconds = Histogram(
    "execution_run_duration_seconds",
    "End-to-end duration of a training execution run",
    ["status"],
    buckets=(30, 60, 300, 900, 1800, 3600, 7200, 14400, 21600),
)
execution_run_total = Counter(
    "execution_run_total",
    "Total execution runs by final status",
    ["status"],
)

llm_request_duration_seconds = Histogram(
    "llm_request_duration_seconds",
    "LLM provider call latency",
    ["provider"],
    buckets=(0.5, 1, 2.5, 5, 10, 30, 60, 120, 300),
)
llm_request_total = Counter(
    "llm_request_total",
    "Total LLM provider calls",
    ["provider", "outcome"],
)

embedding_request_duration_seconds = Histogram(
    "embedding_request_duration_seconds",
    "Embedding provider call latency",
    ["provider"],
    buckets=(0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30),
)

vector_search_duration_seconds = Histogram(
    "vector_search_duration_seconds",
    "pgvector similarity/keyword search latency",
    ["search_type"],  # similarity | keyword | hybrid
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5),
)

neo4j_query_duration_seconds = Histogram(
    "neo4j_query_duration_seconds",
    "Neo4j Cypher query latency",
    ["operation"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5),
)


CELERY_QUEUE_NAMES = (
    "default",
    "paper_processing",
    "knowledge_extraction",
    "embeddings",
    "rag",
    "graph",
    "codegen",
    "execution",
)


async def refresh_celery_queue_depths() -> None:
    """Celery (with a Redis broker) represents each queue as a plain Redis
    list, so its backlog is just that list's length - polled on every
    `/metrics` scrape rather than kept as a live counter."""
    from app.config.redis_config import redis_client

    for queue_name in CELERY_QUEUE_NAMES:
        try:
            depth = await redis_client.llen(queue_name)
        except Exception:  # noqa: BLE001 - a Redis hiccup shouldn't break the scrape
            continue
        celery_queue_depth.labels(queue=queue_name).set(depth)


@contextmanager
def observe_duration(histogram: Histogram, **label_values: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        histogram.labels(**label_values).observe(time.perf_counter() - start)


def render_latest() -> tuple[bytes, str]:
    return generate_latest(), CONTENT_TYPE_LATEST
