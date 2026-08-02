import enum
import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.settings import settings
from app.models.base import BaseModel


class EmbeddingSourceType(str, enum.Enum):
    SECTION = "section"
    KNOWLEDGE_ENTITY = "knowledge_entity"
    FIGURE_CAPTION = "figure_caption"
    TABLE_DESCRIPTION = "table_description"
    EQUATION_DESCRIPTION = "equation_description"


class Embedding(BaseModel):
    """A single embedded vector plus a durable link back to its source object.

    `source_ref` is a stable, human-readable pointer into the object that
    was embedded (e.g. "section:introduction", "figure:page3:0",
    "entity:datasets:1"). Sections/figures/tables/equations live inside
    `Paper.parsed_data` and knowledge entities inside
    `KnowledgeExtraction.extracted_data` - both are JSON blobs rather than
    normalized rows, so `source_ref` is what makes an embedding traceable
    back to the exact sub-object it came from.

    `(paper_id, source_type, source_ref, model_name)` is unique so
    re-generating embeddings for the same paper/model upserts in place
    instead of accumulating duplicates; a knowledge-extraction re-run still
    produces fresh rows because `knowledge_extraction_id` differs, and old
    versions' embeddings are cascade-deleted along with their extraction.

    NOTE: `settings.EMBEDDING_DIMENSIONS` is baked into this column's pgvector
    type at the DB level (see the corresponding migration). Changing the
    embedding provider's dimensionality requires a new migration that alters
    the column type - it cannot be changed by an env var alone.
    """

    __tablename__ = "embeddings"
    __table_args__ = (
        UniqueConstraint(
            "paper_id", "source_type", "source_ref", "model_name", name="uq_embeddings_source_model"
        ),
    )

    paper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    knowledge_extraction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_extractions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    source_type: Mapped[EmbeddingSourceType] = mapped_column(
        Enum(EmbeddingSourceType, name="embedding_source_type", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    source_ref: Mapped[str] = mapped_column(String(512), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    model_provider: Mapped[str] = mapped_column(String(64), nullable=False)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(settings.EMBEDDING_DIMENSIONS), nullable=False)

    paper: Mapped["Paper"] = relationship("Paper", back_populates="embeddings")
    knowledge_extraction: Mapped["KnowledgeExtraction | None"] = relationship(
        "KnowledgeExtraction", back_populates="embeddings"
    )
