import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class PaperProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Paper(BaseModel):
    __tablename__ = "papers"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    status: Mapped[PaperProcessingStatus] = mapped_column(
        Enum(PaperProcessingStatus, name="paper_processing_status", values_callable=lambda x: [e.value for e in x]),
        default=PaperProcessingStatus.PENDING,
        nullable=False,
        index=True,
    )
    parsed_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="papers")
    knowledge_extractions: Mapped[list["KnowledgeExtraction"]] = relationship(
        "KnowledgeExtraction", back_populates="paper", cascade="all, delete-orphan"
    )
    embeddings: Mapped[list["Embedding"]] = relationship(
        "Embedding", back_populates="paper", cascade="all, delete-orphan"
    )
    generated_projects: Mapped[list["GeneratedProject"]] = relationship(
        "GeneratedProject", back_populates="paper", cascade="all, delete-orphan"
    )
    execution_runs: Mapped[list["ExecutionRun"]] = relationship(
        "ExecutionRun", back_populates="paper", cascade="all, delete-orphan"
    )
