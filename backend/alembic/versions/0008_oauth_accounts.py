"""add oauth_accounts table, make users.hashed_password nullable

Revision ID: 0008_oauth_accounts
Revises: 0007_execution_runs
Create Date: 2026-08-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0008_oauth_accounts"
down_revision: Union[str, None] = "0007_execution_runs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

oauth_provider_enum = postgresql.ENUM("google", "github", name="oauth_provider", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    oauth_provider_enum.create(bind, checkfirst=True)

    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=True)

    op.create_table(
        "oauth_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", oauth_provider_enum, nullable=False),
        sa.Column("provider_user_id", sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_oauth_accounts_user_id", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_oauth_accounts"),
        sa.UniqueConstraint("provider", "provider_user_id", name="uq_oauth_accounts_provider_subject"),
    )
    op.create_index("ix_oauth_accounts_user_id", "oauth_accounts", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_oauth_accounts_user_id", table_name="oauth_accounts")
    op.drop_table("oauth_accounts")
    oauth_provider_enum.drop(op.get_bind(), checkfirst=True)
    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=False)
