import io
import logging
import os
import shutil
import tempfile
import threading
import zipfile
from collections.abc import Callable
from dataclasses import dataclass, field

from app.config.settings import settings
from app.execution.backends import ExecutionBackend, MountSpec, RunSpec
from app.execution.docker_runner import DockerExecutionBackend
from app.execution.mlflow_tracking import MLflowTrackingService
from app.execution.resource_monitor import (
    RunProgressTracker,
    get_disk_usage_percent,
    get_gpu_stats,
    parse_progress_line,
)
from app.execution.tensorboard import prepare_run_log_dir
from app.storage.minio_client import get_minio_client

logger = logging.getLogger(__name__)


@dataclass
class SandboxRunResult:
    exit_code: int
    cancelled: bool
    container_id: str
    log_storage_key: str
    artifact_prefix: str
    artifact_manifest: list[str]
    mlflow_experiment_id: str
    mlflow_run_id: str
    tensorboard_log_dir: str
    metrics_summary: dict[str, float] = field(default_factory=dict)


class SandboxExecutor:
    """Orchestrates one full execution end to end: extract the generated
    project, build+run it in an isolated container, stream logs and monitor
    resources while it runs, then collect artifacts and record everything in
    MLflow.

    Synchronous by design - this only ever runs inside a Celery worker
    (never the async FastAPI request path), matching this codebase's
    established convention for worker-only code (see e.g.
    `KnowledgeExtractionAgent`).
    """

    def __init__(
        self, backend: ExecutionBackend | None = None, mlflow: MLflowTrackingService | None = None
    ) -> None:
        self.backend = backend or DockerExecutionBackend()
        self.mlflow = mlflow or MLflowTrackingService()

    def run(
        self,
        execution_run_id: str,
        generated_project_id: str,
        paper_id: str,
        zip_bytes: bytes,
        config: dict,
        device: str,
        on_log_line: Callable[[str], None],
        on_progress: Callable[[dict], None],
        should_cancel: Callable[[], bool],
    ) -> SandboxRunResult:
        project_dir = self._extract_project(generated_project_id, zip_bytes)
        checkpoints_worker_dir, checkpoints_host_dir = self._prepare_subdir(project_dir, "checkpoints")
        data_worker_dir, data_host_dir = self._prepare_subdir(project_dir, "data")
        tb_worker_dir, tb_host_dir = prepare_run_log_dir(execution_run_id)

        experiment_id = self.mlflow.get_or_create_experiment(f"paper-{paper_id}")
        mlflow_run_id = self.mlflow.start_run(
            experiment_id,
            run_name=f"execution-{execution_run_id}",
            tags={
                "generated_project_id": generated_project_id,
                "execution_run_id": execution_run_id,
                "paper_id": paper_id,
            },
        )
        self.mlflow.log_params(mlflow_run_id, _flatten_params(config))

        run_spec = RunSpec(
            build_context=project_dir,
            command=None,  # use the generated image's own ENTRYPOINT/CMD
            mounts=[
                MountSpec(host_path=checkpoints_host_dir, container_path="/workspace/checkpoints"),
                MountSpec(host_path=tb_host_dir, container_path="/workspace/runs"),
                MountSpec(host_path=data_host_dir, container_path="/workspace/data", read_only=True),
            ],
            device=device,
            cpu_limit=settings.EXECUTION_CPU_LIMIT,
            memory_limit_mb=settings.EXECUTION_MEMORY_LIMIT_MB,
            network_disabled=settings.EXECUTION_NETWORK_DISABLED,
            labels={"execution_run_id": execution_run_id},
        )

        handle = self.backend.build_and_start(run_spec)

        tracker = RunProgressTracker()
        log_lines: list[str] = []
        log_stream_done = threading.Event()

        def _stream_logs() -> None:
            try:
                for raw_chunk in self.backend.stream_logs(handle):
                    for line in raw_chunk.splitlines():
                        if not line:
                            continue

                        log_lines.append(line)
                        if len(log_lines) > settings.EXECUTION_LOG_TAIL_LINES:
                            log_lines.pop(0)
                        on_log_line(line)

                        progress = parse_progress_line(line)
                        if progress:
                            tracker.update(progress)
            except Exception:
                logger.exception("Log streaming failed for execution %s", execution_run_id)
            finally:
                log_stream_done.set()

        log_thread = threading.Thread(target=_stream_logs, daemon=True)
        log_thread.start()

        cancelled = False
        while not log_stream_done.is_set():
            if should_cancel():
                self.backend.stop(handle)
                cancelled = True
                break

            usage = self.backend.get_resource_usage(handle)
            gpu_util, gpu_mem = get_gpu_stats() if device == "gpu" else (None, None)

            snapshot = tracker.snapshot()
            snapshot.update(
                {
                    "cpu_percent": usage.cpu_percent,
                    "memory_mb": usage.memory_mb,
                    "memory_limit_mb": usage.memory_limit_mb,
                    "gpu_utilization_percent": gpu_util,
                    "gpu_memory_mb": gpu_mem,
                    "disk_usage_percent": get_disk_usage_percent(project_dir),
                }
            )
            on_progress(snapshot)

            log_stream_done.wait(settings.EXECUTION_MONITOR_INTERVAL_SECONDS)

        log_thread.join(timeout=30)
        exit_code = -1 if cancelled else self.backend.wait(handle, timeout_seconds=5)

        # Persist whatever exists regardless of outcome - partial checkpoints
        # from a failed/cancelled run are still useful.
        log_storage_key = f"executions/{paper_id}/{execution_run_id}/logs.txt"
        _upload_bytes(log_storage_key, "\n".join(log_lines).encode("utf-8"), "text/plain")

        artifact_prefix = f"executions/{paper_id}/{execution_run_id}/"
        artifact_manifest = [
            *_upload_directory(checkpoints_worker_dir, f"{artifact_prefix}checkpoints/"),
            *_upload_directory(tb_worker_dir, f"{artifact_prefix}tensorboard/"),
        ]

        if os.path.isdir(checkpoints_worker_dir) and os.listdir(checkpoints_worker_dir):
            self.mlflow.log_artifacts(mlflow_run_id, checkpoints_worker_dir, artifact_path="checkpoints")
        if os.path.isdir(tb_worker_dir) and os.listdir(tb_worker_dir):
            self.mlflow.log_artifacts(mlflow_run_id, tb_worker_dir, artifact_path="tensorboard")

        final_snapshot = tracker.snapshot()
        metrics_summary = {
            key: value for key, value in final_snapshot.items() if isinstance(value, (int, float))
        }
        if metrics_summary:
            self.mlflow.log_metrics(mlflow_run_id, metrics_summary, step=tracker.epoch or 0)

        mlflow_status = "KILLED" if cancelled else ("FINISHED" if exit_code == 0 else "FAILED")
        self.mlflow.end_run(mlflow_run_id, status=mlflow_status)

        shutil.rmtree(data_worker_dir, ignore_errors=True)  # empty placeholder mount; nothing worth keeping

        return SandboxRunResult(
            exit_code=exit_code,
            cancelled=cancelled,
            container_id=handle.external_id,
            log_storage_key=log_storage_key,
            artifact_prefix=artifact_prefix,
            artifact_manifest=artifact_manifest,
            mlflow_experiment_id=experiment_id,
            mlflow_run_id=mlflow_run_id,
            tensorboard_log_dir=tb_worker_dir,
            metrics_summary=metrics_summary,
        )

    def _extract_project(self, generated_project_id: str, zip_bytes: bytes) -> str:
        # Keyed by generated_project_id (not execution_run_id) so retries of
        # the same generated project reuse the same build context path,
        # letting Docker's layer cache actually help across attempts.
        project_dir = os.path.join(settings.EXECUTION_WORK_ROOT, generated_project_id)
        os.makedirs(project_dir, exist_ok=True)

        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_zip:
            tmp_zip.write(zip_bytes)
            tmp_zip_path = tmp_zip.name

        try:
            with zipfile.ZipFile(tmp_zip_path) as archive:
                _safe_extractall(archive, project_dir)
        finally:
            os.unlink(tmp_zip_path)

        return project_dir

    def _prepare_subdir(self, project_dir: str, name: str) -> tuple[str, str]:
        worker_path = os.path.join(project_dir, name)
        os.makedirs(worker_path, exist_ok=True)

        relative = os.path.relpath(worker_path, settings.EXECUTION_WORK_ROOT)
        host_path = os.path.join(settings.execution_host_work_root, relative)
        return worker_path, host_path


def _safe_extractall(archive: zipfile.ZipFile, destination: str) -> None:
    """Extracts `archive` into `destination`, rejecting any entry whose
    resolved path would land outside it (Zip Slip: `../../etc/passwd`-style
    names, or absolute paths). The archive is codegen-produced rather than
    directly user-uploaded, but defending against a crafted/tampered archive
    here is cheap insurance against writing outside the sandboxed project dir.
    """
    destination_root = os.path.realpath(destination)

    for member in archive.infolist():
        member_path = os.path.realpath(os.path.join(destination, member.filename))
        if member_path != destination_root and not member_path.startswith(destination_root + os.sep):
            raise ValueError(f"Refusing to extract archive member outside destination: {member.filename}")

    archive.extractall(destination)


def _flatten_params(config: dict, prefix: str = "") -> dict[str, object]:
    flat: dict[str, object] = {}
    for key, value in config.items():
        full_key = f"{prefix}{key}"
        if isinstance(value, dict):
            flat.update(_flatten_params(value, prefix=f"{full_key}."))
        else:
            flat[full_key] = value
    return flat


def _upload_bytes(storage_key: str, data: bytes, content_type: str) -> None:
    get_minio_client().put_object(
        bucket_name=settings.MINIO_BUCKET,
        object_name=storage_key,
        data=io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )


def _upload_directory(local_dir: str, prefix: str) -> list[str]:
    if not os.path.isdir(local_dir):
        return []

    client = get_minio_client()
    uploaded: list[str] = []

    for root, _dirs, files in os.walk(local_dir):
        for filename in files:
            local_path = os.path.join(root, filename)
            relative_path = os.path.relpath(local_path, local_dir).replace(os.sep, "/")
            storage_key = f"{prefix}{relative_path}"
            client.fput_object(settings.MINIO_BUCKET, storage_key, local_path)
            uploaded.append(storage_key)

    return uploaded
