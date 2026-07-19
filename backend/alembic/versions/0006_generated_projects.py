"""add generated_projects table

Revision ID: 0006_generated_projects
Revises: 0005_embeddings_fulltext_index
Create Date: 2026-07-06

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0006_generated_projects"
down_revision: Union[str, None] = "0005_embeddings_fulltext_index"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

generated_project_status_enum = postgresql.ENUM(
    "pending", "generating", "validating", "completed", "failed",
    name="generated_project_status", create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    generated_project_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "generated_projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("paper_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("knowledge_extraction_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", generated_project_status_enum, nullable=False),
        sa.Column("framework", sa.String(length=32), nullable=False),
        sa.Column("generation_params", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("context_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("model_provider", sa.String(length=64), nullable=True),
        sa.Column("model_name", sa.String(length=128), nullable=True),
        sa.Column("storage_key", sa.String(length=1024), nullable=True),
        sa.Column("file_manifest", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("quality_score", sa.Float(), nullable=True),
        sa.Column("quality_report", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["paper_id"], ["papers.id"], name="fk_generated_projects_paper_id_papers", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["knowledge_extraction_id"],
            ["knowledge_extractions.id"],
            name="fk_generated_projects_knowledge_extraction_id_knowledge_extractions",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_generated_projects"),
        sa.UniqueConstraint(
            "paper_id", "version", name="uq_generated_projects_paper_version"
        ),
    )

    op.create_index("ix_generated_projects_paper_id", "generated_projects", ["paper_id"], if_not_exists=True)
    op.create_index(
        "ix_generated_projects_knowledge_extraction_id",
        "generated_projects",
        ["knowledge_extraction_id"],
        if_not_exists=True,
    )
    op.create_index("ix_generated_projects_status", "generated_projects", ["status"], if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_generated_projects_status", table_name="generated_projects", if_exists=True)
    op.drop_index("ix_generated_projects_knowledge_extraction_id", table_name="generated_projects", if_exists=True)
    op.drop_index("ix_generated_projects_paper_id", table_name="generated_projects", if_exists=True)
    op.drop_table("generated_projects")

    bind = op.get_bind()
    generated_project_status_enum.drop(bind, checkfirst=True)
