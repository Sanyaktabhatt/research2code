import time

from celery import Celery
from celery.signals import task_failure, task_postrun, task_prerun, worker_process_init

from app.config.settings import settings

celery_app = Celery(
    "research2code",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.execution.celery_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_default_queue="default",
    # A broker restart shouldn't take the worker down with it - keep
    # retrying the connection instead of raising on startup.
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=None,
    task_routes={
        "papers.process_paper": {"queue": "paper_processing"},
        "papers.extract_knowledge": {"queue": "knowledge_extraction"},
        "embeddings.generate_paper_embeddings": {"queue": "embeddings"},
        "embeddings.generate_knowledge_embeddings": {"queue": "embeddings"},
        "rag.warm_cache": {"queue": "rag"},
        "graph.build_graph": {"queue": "graph"},
        "codegen.generate_project": {"queue": "codegen"},
        # Long-running (potentially hours) and resource-heavy - in a larger
        # deployment this queue should be served by a dedicated worker pool
        # sized to the host's available CPU/GPU capacity, separate from the
        # quick queues above.
        "execution.execute_run": {"queue": "execution"},
    },
)


@worker_process_init.connect
def _init_worker_process(**kwargs) -> None:
    from app.observability.tracing import setup_celery_tracing
    from app.utils.logger import setup_logging

    setup_logging()
    setup_celery_tracing()


# Per-task-id start times for the Prometheus duration histogram below.
# Bounded in practice by `worker_prefetch_multiplier=1` + per-worker
# concurrency, so this dict never holds more than a handful of entries.
_task_start_times: dict[str, float] = {}


@task_prerun.connect
def _record_task_start(task_id: str, **kwargs) -> None:
    _task_start_times[task_id] = time.perf_counter()


@task_postrun.connect
def _record_task_duration(task_id: str, task, state: str, **kwargs) -> None:
    from app.observability.metrics import celery_task_duration_seconds, celery_task_total

    start = _task_start_times.pop(task_id, None)
    if start is not None:
        celery_task_duration_seconds.labels(task_name=task.name).observe(time.perf_counter() - start)
    celery_task_total.labels(task_name=task.name, outcome=state.lower()).inc()


@task_failure.connect
def _record_task_failure(task_id: str, sender=None, **kwargs) -> None:
    _task_start_times.pop(task_id, None)
