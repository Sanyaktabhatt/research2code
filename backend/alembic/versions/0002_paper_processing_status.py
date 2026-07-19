"""add paper processing status, parsed_data and error_message

Revision ID: 0002_paper_processing_status
Revises: 0001_initial_schema
Create Date: 2026-07-05

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002_paper_processing_status"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

paper_processing_status_enum = postgresql.ENUM(
    "pending", "processing", "completed", "failed", name="paper_processing_status", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    paper_processing_status_enum.create(bind, checkfirst=True)

    op.add_column(
        "papers",
        sa.Column(
            "status",
            paper_processing_status_enum,
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column("papers", sa.Column("parsed_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("papers", sa.Column("error_message", sa.Text(), nullable=True))

    op.create_index("ix_papers_status", "papers", ["status"], if_not_exists=True)

    # The server_default above only exists to backfill pre-existing rows; the
    # application always supplies the value explicitly on insert.
    op.alter_column("papers", "status", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_papers_status", table_name="papers", if_exists=True)
    op.drop_column("papers", "error_message")
    op.drop_column("papers", "parsed_data")
    op.drop_column("papers", "status")

    bind = op.get_bind()
    paper_processing_status_enum.drop(bind, checkfirst=True)
