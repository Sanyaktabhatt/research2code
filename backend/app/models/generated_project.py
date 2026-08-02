import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class GeneratedProjectStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATING = "generating"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"


class GeneratedProject(BaseModel):
    """One versioned, downloadable code-generation run for a paper.

    Versioned per paper (like `KnowledgeExtraction`/`FileVersion`): a new
    generation always creates a new row rather than overwriting a prior one,
    so regeneration (after a template/prompt change, for example) never
    loses a previous artifact. The actual project files live in MinIO as a
    ZIP (`storage_key`); `file_manifest` is a lightweight path listing kept
    on the row for quick display without downloading/unzipping.
    """

    __tablename__ = "generated_projects"
    __table_args__ = (
        UniqueConstraint("paper_id", "version", name="uq_generated_projects_paper_version"),
    )

    paper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    knowledge_extraction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_extractions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[GeneratedProjectStatus] = mapped_column(
        Enum(
            GeneratedProjectStatus,
            name="generated_project_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=GeneratedProjectStatus.PENDING,
        nullable=False,
        index=True,
    )
    framework: Mapped[str] = mapped_column(String(32), nullable=False)
    generation_params: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # Snapshot of the RAG retrieval + knowledge-graph context the orchestrator
    # had already gathered when it decided to trigger generation (research
    # notes, graph facts, retrieval context text). The Celery task runs later
    # in a separate process with no access to that in-memory orchestrator
    # state, so it reads the context back from here instead of re-running
    # retrieval/graph traversal itself.
    context_snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    model_provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    storage_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    file_manifest: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality_report: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    paper: Mapped["Paper"] = relationship("Paper", back_populates="generated_projects")
    knowledge_extraction: Mapped["KnowledgeExtraction"] = relationship(
        "KnowledgeExtraction", back_populates="generated_projects"
    )
    execution_runs: Mapped[list["ExecutionRun"]] = relationship(
        "ExecutionRun", back_populates="generated_project", cascade="all, delete-orphan"
    )
