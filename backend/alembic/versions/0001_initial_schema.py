"""initial schema: users, projects, papers, file_assets, file_versions

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-05

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False: the enum types are created/dropped explicitly below so that
# op.create_table does not also try to emit (and duplicate) CREATE TYPE.
user_role_enum = postgresql.ENUM("admin", "user", name="user_role", create_type=False)
project_status_enum = postgresql.ENUM(
    "created", "processing", "completed", "failed", name="project_status", create_type=False
)
file_category_enum = postgresql.ENUM("pdf", "image", name="file_category", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)
    project_status_enum.create(bind, checkfirst=True)
    file_category_enum.create(bind, checkfirst=True)

    # --- users -----------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("role", user_role_enum, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True, if_not_exists=True)

    # --- projects (FK -> users) -------------------------------------------
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", project_status_enum, nullable=False),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], name="fk_projects_owner_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_projects"),
    )
    op.create_index("ix_projects_owner_id", "projects", ["owner_id"], if_not_exists=True)

    # --- file_assets (FK -> users) -----------------------------------------
    op.create_table(
        "file_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", file_category_enum, nullable=False),
        sa.Column("original_filename", sa.String(length=512), nullable=False),
        sa.Column("latest_version", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], name="fk_file_assets_owner_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_file_assets"),
    )
    op.create_index("ix_file_assets_owner_id", "file_assets", ["owner_id"], if_not_exists=True)

    # --- papers (FK -> projects) --------------------------------------------
    op.create_table(
        "papers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("original_filename", sa.String(length=512), nullable=False),
        sa.Column("storage_key", sa.String(length=1024), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["project_id"], ["projects.id"], name="fk_papers_project_id_projects", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_papers"),
    )
    op.create_index("ix_papers_project_id", "papers", ["project_id"], if_not_exists=True)

    # --- file_versions (FK -> file_assets) -----------------------------------
    op.create_table(
        "file_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("file_asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(length=1024), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(
            ["file_asset_id"],
            ["file_assets.id"],
            name="fk_file_versions_file_asset_id_file_assets",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_file_versions"),
        sa.UniqueConstraint(
            "file_asset_id", "version", name="uq_file_versions_asset_version"
        ),
    )
    op.create_index("ix_file_versions_file_asset_id", "file_versions", ["file_asset_id"], if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_file_versions_file_asset_id", table_name="file_versions", if_exists=True)
    op.drop_table("file_versions")

    op.drop_index("ix_papers_project_id", table_name="papers", if_exists=True)
    op.drop_table("papers")

    op.drop_index("ix_file_assets_owner_id", table_name="file_assets", if_exists=True)
    op.drop_table("file_assets")

    op.drop_index("ix_projects_owner_id", table_name="projects", if_exists=True)
    op.drop_table("projects")

    op.drop_index("ix_users_email", table_name="users", if_exists=True)
    op.drop_table("users")

    bind = op.get_bind()
    file_category_enum.drop(bind, checkfirst=True)
    project_status_enum.drop(bind, checkfirst=True)
    user_role_enum.drop(bind, checkfirst=True)
