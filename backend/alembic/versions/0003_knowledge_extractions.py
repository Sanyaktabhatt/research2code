"""add knowledge_extractions table

Revision ID: 0003_knowledge_extractions
Revises: 0002_paper_processing_status
Create Date: 2026-07-05

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0003_knowledge_extractions"
down_revision: Union[str, None] = "0002_paper_processing_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

knowledge_extraction_status_enum = postgresql.ENUM(
    "pending", "processing", "completed", "failed", name="knowledge_extraction_status", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    knowledge_extraction_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "knowledge_extractions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("paper_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", knowledge_extraction_status_enum, nullable=False),
        sa.Column("model_provider", sa.String(length=64), nullable=True),
        sa.Column("model_name", sa.String(length=128), nullable=True),
        sa.Column("extracted_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["paper_id"], ["papers.id"], name="fk_knowledge_extractions_paper_id_papers", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_knowledge_extractions"),
        sa.UniqueConstraint(
            "paper_id", "version", name="uq_knowledge_extractions_paper_version"
        ),
    )
    op.create_index("ix_knowledge_extractions_paper_id", "knowledge_extractions", ["paper_id"], if_not_exists=True)
    op.create_index("ix_knowledge_extractions_status", "knowledge_extractions", ["status"], if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_knowledge_extractions_status", table_name="knowledge_extractions", if_exists=True)
    op.drop_index("ix_knowledge_extractions_paper_id", table_name="knowledge_extractions", if_exists=True)
    op.drop_table("knowledge_extractions")

    bind = op.get_bind()
    knowledge_extraction_status_enum.drop(bind, checkfirst=True)
