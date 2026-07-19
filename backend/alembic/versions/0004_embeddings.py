"""add pgvector extension and embeddings table

Revision ID: 0004_embeddings
Revises: 0003_knowledge_extractions
Create Date: 2026-07-05

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0004_embeddings"
down_revision: Union[str, None] = "0003_knowledge_extractions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

embedding_source_type_enum = postgresql.ENUM(
    "section",
    "knowledge_entity",
    "figure_caption",
    "table_description",
    "equation_description",
    name="embedding_source_type",
    create_type=False,
)

# Must match settings.EMBEDDING_DIMENSIONS at the time this migration was
# written. Changing the embedding provider's output dimensionality later
# requires a new migration that alters this column's type - it is a fixed
# part of the schema, not something an env var can change after the fact.
EMBEDDING_DIMENSIONS = 1536


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    bind = op.get_bind()
    embedding_source_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "embeddings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("paper_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("knowledge_extraction_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source_type", embedding_source_type_enum, nullable=False),
        sa.Column("source_ref", sa.String(length=512), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("model_provider", sa.String(length=64), nullable=False),
        sa.Column("model_name", sa.String(length=128), nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIMENSIONS), nullable=False),
        sa.ForeignKeyConstraint(
            ["paper_id"], ["papers.id"], name="fk_embeddings_paper_id_papers", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["knowledge_extraction_id"],
            ["knowledge_extractions.id"],
            name="fk_embeddings_knowledge_extraction_id_knowledge_extractions",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_embeddings"),
        sa.UniqueConstraint(
            "paper_id", "source_type", "source_ref", "model_name", name="uq_embeddings_source_model"
        ),
    )

    op.create_index("ix_embeddings_paper_id", "embeddings", ["paper_id"], if_not_exists=True)
    op.create_index(
        "ix_embeddings_knowledge_extraction_id", "embeddings", ["knowledge_extraction_id"], if_not_exists=True
    )
    op.create_index("ix_embeddings_source_type", "embeddings", ["source_type"], if_not_exists=True)

    # HNSW index for fast approximate cosine-similarity search.
    op.create_index(
        "ix_embeddings_embedding_hnsw_cosine",
        "embeddings",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )


def downgrade() -> None:
    op.drop_index("ix_embeddings_embedding_hnsw_cosine", table_name="embeddings", if_exists=True)
    op.drop_index("ix_embeddings_source_type", table_name="embeddings", if_exists=True)
    op.drop_index("ix_embeddings_knowledge_extraction_id", table_name="embeddings", if_exists=True)
    op.drop_index("ix_embeddings_paper_id", table_name="embeddings", if_exists=True)
    op.drop_table("embeddings")

    bind = op.get_bind()
    embedding_source_type_enum.drop(bind, checkfirst=True)

    # The vector extension is left installed since other objects/migrations
    # may depend on it; dropping extensions is a deliberate, separate action.
