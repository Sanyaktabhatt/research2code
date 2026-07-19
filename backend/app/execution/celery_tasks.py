import io
import json
import logging
import time
import uuid
import zipfile
from datetime import datetime, timezone

import yaml
from celery import Task
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.embedding_provider import get_embedding_provider
from app.agents.embedding_targets import (
    EmbeddingTarget,
    build_knowledge_embedding_targets,
    build_paper_embedding_targets,
)
from app.agents.paper_parser_agent import KnowledgeExtractionAgent
from app.agents.schemas import ExtractedKnowledge
from app.codegen.exporters import ZipExporter
from app.codegen.project_builder import ProjectBuilder
from app.codegen.schemas import GenerationOptions, ProjectGenerationSpec
from app.codegen.validator import CodeQualityValidator
from app.config.celery_config import celery_app
from app.config.database import get_sync_db
from app.config.neo4j_client import sync_neo4j_driver
from app.config.redis_config import sync_redis_client
from app.config.settings import settings
from app.execution.sandbox_executor import SandboxExecutor
from app.models.embedding import Embedding
from app.models.execution_run import ExecutionRun, ExecutionRunStatus
from app.models.generated_project import GeneratedProject, GeneratedProjectStatus
from app.models.knowledge import KnowledgeExtraction, KnowledgeExtractionStatus
from app.models.paper import Paper, PaperProcessingStatus
from app.models.project import Project
from app.observability.metrics import (
    execution_run_duration_seconds,
    execution_run_total,
    neo4j_query_duration_seconds,
    observe_duration,
)
from app.parser.pipeline import PaperParsingPipeline
from app.parser.schemas import ParsedPaper
from app.repositories.embedding_queries import keyword_search_stmt, similarity_search_stmt
from app.services.knowledge_graph_builder import build_graph_operations
from app.services.retrieval_cache import build_retrieval_cache_key, serialize_chunks
from app.services.retrieval_fusion import fuse_ranked_hits
from app.storage.minio_client import get_minio_client

logger = logging.getLogger(__name__)

# Applied uniformly to every task below via `**RETRY_BACKOFF_KWARGS` so every
# retry path backs off exponentially (capped) with jitter, instead of the
# fixed `default_retry_delay` each task used in isolation before.
RETRY_BACKOFF_KWARGS = {"retry_backoff": True, "retry_backoff_max": 600, "retry_jitter": True}

DEFAULT_RAG_WARM_QUERIES = [
    "What is the main contribution of this paper?",
    "What datasets were used in this work?",
    "What are the key experimental results?",
]


@celery_app.task(
    name="papers.process_paper",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(ConnectionError,),
    **RETRY_BACKOFF_KWARGS,
)
def process_paper_task(self: Task, paper_id: str) -> None:
    """Parses an uploaded PDF and persists the structured result + status.

    Runs on a Celery worker outside the FastAPI event loop, so it uses the
    synchronous SQLAlchemy session and the (synchronous) MinIO SDK directly.
    """
    with get_sync_db() as session:
        paper = session.get(Paper, uuid.UUID(paper_id))
        if paper is None:
            logger.warning("Paper %s no longer exists; skipping processing", paper_id)
            return

        paper.status = PaperProcessingStatus.PROCESSING
        paper.error_message = None
        session.commit()

        try:
            pdf_bytes = _download_pdf(paper.storage_key)
            parsed = PaperParsingPipeline().run(pdf_bytes)

            paper.parsed_data = parsed.model_dump(mode="json")
            paper.status = PaperProcessingStatus.COMPLETED
            session.commit()
        except Exception as exc:  # noqa: BLE001 - persisted for operator visibility, then re-raised
            session.rollback()
            paper.status = PaperProcessingStatus.FAILED
            paper.error_message = str(exc)[:2000]
            session.commit()
            logger.exception("Failed to process paper %s", paper_id)
            raise

    generate_paper_embeddings_task.delay(paper_id)


@celery_app.task(
    name="papers.extract_knowledge",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(ConnectionError, TimeoutError),
    **RETRY_BACKOFF_KWARGS,
)
def extract_knowledge_task(self: Task, extraction_id: str) -> None:
    """Runs the LLM knowledge-extraction agent over an already-parsed paper.

    Reads `Paper.parsed_data` rather than the source PDF, so incremental
    re-extraction (new prompt, schema, or model) never re-parses the PDF.
    """
    with get_sync_db() as session:
        extraction = session.get(KnowledgeExtraction, uuid.UUID(extraction_id))
        if extraction is None:
            logger.warning("Knowledge extraction %s no longer exists; skipping", extraction_id)
            return

        paper = session.get(Paper, extraction.paper_id)
        if paper is None:
            logger.warning(
                "Paper %s for extraction %s no longer exists; skipping", extraction.paper_id, extraction_id
            )
            return

        extraction.status = KnowledgeExtractionStatus.PROCESSING
        extraction.error_message = None
        session.commit()

        try:
            if paper.parsed_data is None:
                raise ValueError(f"Paper {paper.id} has no parsed data to extract knowledge from")

            parsed_paper = ParsedPaper.model_validate(paper.parsed_data)
            result = KnowledgeExtractionAgent().extract(parsed_paper)

            extraction.extracted_data = result.model_dump(mode="json")
            extraction.model_provider = settings.LLM_PROVIDER
            extraction.model_name = settings.LLM_MODEL
            extraction.status = KnowledgeExtractionStatus.COMPLETED
            session.commit()
        except Exception as exc:  # noqa: BLE001 - persisted for operator visibility, then re-raised
            session.rollback()
            extraction.status = KnowledgeExtractionStatus.FAILED
            extraction.error_message = str(exc)[:2000]
            session.commit()
            logger.exception("Failed to extract knowledge for extraction %s", extraction_id)
            raise

    # A new knowledge-extraction version always gets its own fresh embeddings
    # and its own fresh knowledge-graph snapshot.
    generate_knowledge_embeddings_task.delay(extraction_id)
    build_knowledge_graph_task.delay(extraction_id)


@celery_app.task(
    name="embeddings.generate_paper_embeddings",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(ConnectionError, TimeoutError),
    **RETRY_BACKOFF_KWARGS,
)
def generate_paper_embeddings_task(self: Task, paper_id: str) -> None:
    """Batch-embeds a paper's sections, figure captions, table descriptions and equations."""
    with get_sync_db() as session:
        paper = session.get(Paper, uuid.UUID(paper_id))
        if paper is None or paper.parsed_data is None:
            logger.warning("Paper %s has no parsed data to embed; skipping", paper_id)
            return

        parsed_paper = ParsedPaper.model_validate(paper.parsed_data)
        targets = build_paper_embedding_targets(parsed_paper)
        _persist_embeddings(session, paper.id, None, targets)


@celery_app.task(
    name="embeddings.generate_knowledge_embeddings",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(ConnectionError, TimeoutError),
    **RETRY_BACKOFF_KWARGS,
)
def generate_knowledge_embeddings_task(self: Task, extraction_id: str) -> None:
    """Batch-embeds every normalized entity from one knowledge-extraction version."""
    with get_sync_db() as session:
        extraction = session.get(KnowledgeExtraction, uuid.UUID(extraction_id))
        if extraction is None or extraction.extracted_data is None:
            logger.warning("Knowledge extraction %s has no data to embed; skipping", extraction_id)
            return

        extracted = ExtractedKnowledge.model_validate(extraction.extracted_data)
        targets = build_knowledge_embedding_targets(extracted)
        _persist_embeddings(session, extraction.paper_id, extraction.id, targets)


def _persist_embeddings(
    session: Session,
    paper_id: uuid.UUID,
    knowledge_extraction_id: uuid.UUID | None,
    targets: list[EmbeddingTarget],
) -> None:
    """Embeds targets in batches and upserts them by (paper, source_type, source_ref, model)."""
    if not targets:
        return

    provider = get_embedding_provider()
    contents = [target.content for target in targets]
    vectors: list[list[float]] = []

    for start in range(0, len(contents), settings.EMBEDDING_BATCH_SIZE):
        batch = contents[start : start + settings.EMBEDDING_BATCH_SIZE]
        vectors.extend(provider.embed_documents(batch))

    for target, vector in zip(targets, vectors):
        existing = session.execute(
            select(Embedding).where(
                Embedding.paper_id == paper_id,
                Embedding.source_type == target.source_type,
                Embedding.source_ref == target.source_ref,
                Embedding.model_name == provider.model_name,
            )
        ).scalar_one_or_none()

        if existing is not None:
            existing.content = target.content
            existing.embedding = vector
            existing.embedding_metadata = target.metadata
            existing.knowledge_extraction_id = knowledge_extraction_id
        else:
            session.add(
                Embedding(
                    paper_id=paper_id,
                    knowledge_extraction_id=knowledge_extraction_id,
                    source_type=target.source_type,
                    source_ref=target.source_ref,
                    content=target.content,
                    embedding_metadata=target.metadata,
                    model_provider=provider.provider_name,
                    model_name=provider.model_name,
                    embedding=vector,
                )
            )

    session.commit()


@celery_app.task(
    name="graph.build_graph",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(ConnectionError,),
    **RETRY_BACKOFF_KWARGS,
)
def build_knowledge_graph_task(self: Task, extraction_id: str) -> None:
    """Builds the Neo4j snapshot for one knowledge-extraction version.

    Runs the same `build_graph_operations` used everywhere else against the
    synchronous Neo4j driver, since this is a Celery worker.
    """
    with get_sync_db() as session:
        extraction = session.get(KnowledgeExtraction, uuid.UUID(extraction_id))
        if extraction is None or extraction.extracted_data is None:
            logger.warning("Knowledge extraction %s has no data to graph; skipping", extraction_id)
            return

        paper_id = str(extraction.paper_id)
        version = extraction.version
        extracted = ExtractedKnowledge.model_validate(extraction.extracted_data)

    operations = build_graph_operations(paper_id, extraction_id, version, extracted)

    def _write(tx):
        for op in operations:
            tx.run(op.cypher, op.params)

    with sync_neo4j_driver.session() as neo4j_session:
        with observe_duration(neo4j_query_duration_seconds, operation="write"):
            neo4j_session.execute_write(_write)


@celery_app.task(
    name="rag.warm_cache",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    autoretry_for=(ConnectionError, TimeoutError),
    **RETRY_BACKOFF_KWARGS,
)
def warm_rag_cache_task(self: Task, paper_id: str, queries: list[str] | None = None) -> None:
    """Pre-populates the Redis retrieval cache for a paper's likely queries.

    Uses the exact same statement builders, fusion logic and cache-key
    scheme as the real (async) `RetrievalService`, so a query issued by the
    paper's owner after warming hits these cached results directly.
    """
    warm_queries = queries or DEFAULT_RAG_WARM_QUERIES

    with get_sync_db() as session:
        paper = session.get(Paper, uuid.UUID(paper_id))
        if paper is None:
            logger.warning("Paper %s no longer exists; skipping cache warm", paper_id)
            return

        project = session.get(Project, paper.project_id)
        if project is None:
            logger.warning("Project for paper %s no longer exists; skipping cache warm", paper_id)
            return

        owner_id = project.owner_id
        provider = get_embedding_provider()
        limit = settings.RAG_DEFAULT_LIMIT
        fetch_limit = max(limit * 4, 20)

        for query in warm_queries:
            query_vector = provider.embed_query(query)

            vector_hits = session.execute(
                similarity_search_stmt(query_vector, owner_id, False, fetch_limit, None, paper.id)
            ).all()
            keyword_hits = session.execute(
                keyword_search_stmt(query, owner_id, False, fetch_limit, None, paper.id)
            ).all()

            chunks = fuse_ranked_hits(vector_hits, keyword_hits, limit)

            cache_key = build_retrieval_cache_key(query, owner_id, paper.id, None, limit)
            sync_redis_client.set(cache_key, serialize_chunks(chunks), ex=settings.RAG_CACHE_TTL_SECONDS)


@celery_app.task(
    name="codegen.generate_project",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    autoretry_for=(ConnectionError, TimeoutError),
    **RETRY_BACKOFF_KWARGS,
)
def generate_project_task(self: Task, generated_project_id: str) -> None:
    """Renders, validates, packages and stores one full generated project.

    Publishes progress to Redis (`codegen:progress:{id}`) at each stage so
    the WebSocket endpoint can stream them to the client in real time.
    """
    with get_sync_db() as session:
        project = session.get(GeneratedProject, uuid.UUID(generated_project_id))
        if project is None:
            logger.warning("Generated project %s no longer exists; skipping", generated_project_id)
            return

        project.status = GeneratedProjectStatus.GENERATING
        project.error_message = None
        session.commit()
        _publish_codegen_progress(generated_project_id, "generating", "Rendering project scaffold")

        try:
            extraction = session.get(KnowledgeExtraction, project.knowledge_extraction_id)
            if extraction is None or extraction.extracted_data is None:
                raise ValueError("Source knowledge extraction is missing or has no extracted data")

            options = GenerationOptions.model_validate(project.generation_params)
            context = project.context_snapshot or {}
            spec = ProjectGenerationSpec(
                options=options,
                extracted=ExtractedKnowledge.model_validate(extraction.extracted_data),
                graph_facts_text=context.get("graph_facts_text", ""),
                research_notes=context.get("research_notes", ""),
            )

            files = ProjectBuilder().build(spec)

            project.status = GeneratedProjectStatus.VALIDATING
            session.commit()
            _publish_codegen_progress(generated_project_id, "validating", "Running automated quality checks")

            report = CodeQualityValidator().validate(files, options)

            _publish_codegen_progress(generated_project_id, "packaging", "Packaging project as a ZIP archive")
            archive_bytes = ZipExporter().export(files)
            storage_key = f"generated_projects/{project.paper_id}/{project.id}.zip"
            _upload_project_archive(storage_key, archive_bytes)

            project.storage_key = storage_key
            project.file_manifest = files.paths()
            project.quality_score = report.score
            project.quality_report = report.model_dump(mode="json")
            project.model_provider = settings.LLM_PROVIDER
            project.model_name = settings.LLM_MODEL
            project.status = GeneratedProjectStatus.COMPLETED
            session.commit()

            _publish_codegen_progress(
                generated_project_id, "completed", f"Done - quality score {report.score:.2f}"
            )
        except Exception as exc:  # noqa: BLE001 - persisted for operator visibility, then re-raised
            session.rollback()
            project.status = GeneratedProjectStatus.FAILED
            project.error_message = str(exc)[:2000]
            session.commit()
            _publish_codegen_progress(generated_project_id, "failed", str(exc)[:500])
            logger.exception("Failed to generate project %s", generated_project_id)
            raise


@celery_app.task(
    name="execution.execute_run",
    bind=True,
    max_retries=1,
    default_retry_delay=30,
    soft_time_limit=settings.EXECUTION_TIMEOUT_SECONDS,
    time_limit=settings.EXECUTION_TIMEOUT_SECONDS + 60,
)
def execute_run_task(self: Task, execution_run_id: str) -> None:
    """Runs one `ExecutionRun`: builds+starts the generated project's Docker
    image, streams logs/resource metrics to Redis pub/sub in real time,
    tracks the run in MLflow, and persists artifacts to MinIO.
    """
    cancel_key = f"execution:cancel:{execution_run_id}"
    sync_redis_client.delete(cancel_key)  # clear any stale flag from a prior attempt

    with get_sync_db() as session:
        run = session.get(ExecutionRun, uuid.UUID(execution_run_id))
        if run is None:
            logger.warning("Execution run %s no longer exists; skipping", execution_run_id)
            return

        if run.status == ExecutionRunStatus.CANCELLED:
            logger.info("Execution run %s was cancelled before starting; skipping", execution_run_id)
            return

        project = session.get(GeneratedProject, run.generated_project_id)
        if project is None or not project.storage_key:
            run.status = ExecutionRunStatus.FAILED
            run.error_message = "Source generated project is missing or has no stored artifact"
            session.commit()
            return

        run.status = ExecutionRunStatus.RUNNING
        run.started_at = datetime.now(timezone.utc)
        session.commit()
        _publish_execution_event(execution_run_id, {"type": "status", "status": "running"})
        _monitor_start = time.perf_counter()

        try:
            zip_bytes = _download_object(project.storage_key)
            config = _read_project_config(zip_bytes)
            run.params_snapshot = _flatten_execution_params(config)
            session.commit()

            def _on_log_line(line: str) -> None:
                _publish_execution_event(execution_run_id, {"type": "log", "line": line})

            def _on_progress(snapshot: dict) -> None:
                _publish_execution_event(execution_run_id, {"type": "metrics", **snapshot})

            def _should_cancel() -> bool:
                return sync_redis_client.exists(cancel_key) > 0

            result = SandboxExecutor().run(
                execution_run_id=execution_run_id,
                generated_project_id=str(project.id),
                paper_id=str(run.paper_id),
                zip_bytes=zip_bytes,
                config=config,
                device=run.device.value,
                on_log_line=_on_log_line,
                on_progress=_on_progress,
                should_cancel=_should_cancel,
            )

            run.container_id = result.container_id
            run.mlflow_experiment_id = result.mlflow_experiment_id
            run.mlflow_run_id = result.mlflow_run_id
            run.tensorboard_log_dir = result.tensorboard_log_dir
            run.log_storage_key = result.log_storage_key
            run.artifact_prefix = result.artifact_prefix
            run.artifact_manifest = result.artifact_manifest
            run.metrics_summary = result.metrics_summary
            run.exit_code = result.exit_code
            run.finished_at = datetime.now(timezone.utc)

            if result.cancelled:
                run.status = ExecutionRunStatus.CANCELLED
            elif result.exit_code == 0:
                run.status = ExecutionRunStatus.COMPLETED
            else:
                run.status = ExecutionRunStatus.FAILED
                run.error_message = f"Training process exited with code {result.exit_code}"

            session.commit()
            _publish_execution_event(execution_run_id, {"type": "status", "status": run.status.value})
        except Exception as exc:  # noqa: BLE001 - persisted for operator visibility, then re-raised
            session.rollback()
            run.status = ExecutionRunStatus.FAILED
            run.error_message = str(exc)[:2000]
            run.finished_at = datetime.now(timezone.utc)
            session.commit()
            _publish_execution_event(execution_run_id, {"type": "status", "status": "failed", "error": str(exc)[:500]})
            logger.exception("Execution run %s failed", execution_run_id)
            raise
        finally:
            sync_redis_client.delete(cancel_key)
            duration = time.perf_counter() - _monitor_start
            execution_run_duration_seconds.labels(status=run.status.value).observe(duration)
            execution_run_total.labels(status=run.status.value).inc()


def _publish_execution_event(execution_run_id: str, payload: dict) -> None:
    sync_redis_client.publish(f"execution:progress:{execution_run_id}", json.dumps(payload))


def _read_project_config(zip_bytes: bytes) -> dict:
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
        with archive.open("config.yaml") as config_file:
            return yaml.safe_load(config_file) or {}


def _flatten_execution_params(config: dict, prefix: str = "") -> dict[str, object]:
    flat: dict[str, object] = {}
    for key, value in config.items():
        full_key = f"{prefix}{key}"
        if isinstance(value, dict):
            flat.update(_flatten_execution_params(value, prefix=f"{full_key}."))
        else:
            flat[full_key] = value
    return flat


def _download_object(storage_key: str) -> bytes:
    client = get_minio_client()
    response = client.get_object(settings.MINIO_BUCKET, storage_key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def _publish_codegen_progress(generated_project_id: str, stage: str, message: str) -> None:
    channel = f"codegen:progress:{generated_project_id}"
    payload = json.dumps({"stage": stage, "message": message})
    sync_redis_client.publish(channel, payload)


def _upload_project_archive(storage_key: str, data: bytes) -> None:
    get_minio_client().put_object(
        bucket_name=settings.MINIO_BUCKET,
        object_name=storage_key,
        data=io.BytesIO(data),
        length=len(data),
        content_type="application/zip",
    )


def _download_pdf(storage_key: str) -> bytes:
    client = get_minio_client()
    response = client.get_object(settings.MINIO_BUCKET, storage_key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()
