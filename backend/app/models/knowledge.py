import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class KnowledgeExtractionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class KnowledgeExtraction(BaseModel):
    """One LLM extraction run over a paper's parsed data.

    Stored separately from `Paper.parsed_data`, and versioned per paper so a
    re-extraction (e.g. after a prompt/schema/model change) never overwrites
    prior results and never requires re-parsing the source PDF.
    """

    __tablename__ = "knowledge_extractions"
    __table_args__ = (
        UniqueConstraint("paper_id", "version", name="uq_knowledge_extractions_paper_version"),
    )

    paper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[KnowledgeExtractionStatus] = mapped_column(
        Enum(
            KnowledgeExtractionStatus,
            name="knowledge_extraction_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=KnowledgeExtractionStatus.PENDING,
        nullable=False,
        index=True,
    )
    model_provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    extracted_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    paper: Mapped["Paper"] = relationship("Paper", back_populates="knowledge_extractions")
    embeddings: Mapped[list["Embedding"]] = relationship(
        "Embedding", back_populates="knowledge_extraction", cascade="all, delete-orphan"
    )
    generated_projects: Mapped[list["GeneratedProject"]] = relationship(
        "GeneratedProject", back_populates="knowledge_extraction", cascade="all, delete-orphan"
    )
