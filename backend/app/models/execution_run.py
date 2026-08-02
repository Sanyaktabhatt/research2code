import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ExecutionRunStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExecutionDevice(str, enum.Enum):
    CPU = "cpu"
    GPU = "gpu"


class ExecutionRun(BaseModel):
    """One execution attempt of a `GeneratedProject` inside an isolated
    container.

    Versioned per generated project (like `KnowledgeExtraction`/
    `GeneratedProject` are versioned per paper): a retry never mutates a
    prior attempt, it creates a new row, so the full run history - including
    failed attempts - is preserved and independently comparable.

    `execution_backend` exists so a future Kubernetes/cloud runner can be
    added by implementing `ExecutionBackend` (see `app.execution.backends`)
    and recording its name here - nothing about this model is Docker-specific.
    """

    __tablename__ = "execution_runs"
    __table_args__ = (
        UniqueConstraint("generated_project_id", "version", name="uq_execution_runs_project_version"),
    )

    generated_project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("generated_projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    paper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ExecutionRunStatus] = mapped_column(
        Enum(ExecutionRunStatus, name="execution_run_status", values_callable=lambda x: [e.value for e in x]),
        default=ExecutionRunStatus.QUEUED,
        nullable=False,
        index=True,
    )
    execution_backend: Mapped[str] = mapped_column(String(32), nullable=False, default="docker")
    device: Mapped[ExecutionDevice] = mapped_column(
        Enum(ExecutionDevice, name="execution_device", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ExecutionDevice.CPU,
    )
    container_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # MLflow / TensorBoard linkage
    mlflow_experiment_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mlflow_run_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tensorboard_log_dir: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    # Artifacts (stored in MinIO; versioned implicitly by this row's id)
    log_storage_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    artifact_prefix: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    artifact_manifest: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Snapshots used for comparison without re-reading MLflow/the project ZIP.
    params_snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    metrics_summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    exit_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    generated_project: Mapped["GeneratedProject"] = relationship(
        "GeneratedProject", back_populates="execution_runs"
    )
    paper: Mapped["Paper"] = relationship("Paper", back_populates="execution_runs")
