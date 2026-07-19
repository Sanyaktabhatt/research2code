"""add execution_runs table

Revision ID: 0007_execution_runs
Revises: 0006_generated_projects
Create Date: 2026-07-06

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0007_execution_runs"
down_revision: Union[str, None] = "0006_generated_projects"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

execution_run_status_enum = postgresql.ENUM(
    "queued", "running", "completed", "failed", "cancelled",
    name="execution_run_status", create_type=False,
)
execution_device_enum = postgresql.ENUM("cpu", "gpu", name="execution_device", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    execution_run_status_enum.create(bind, checkfirst=True)
    execution_device_enum.create(bind, checkfirst=True)

    op.create_table(
        "execution_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("generated_project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("paper_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", execution_run_status_enum, nullable=False),
        sa.Column("execution_backend", sa.String(length=32), nullable=False),
        sa.Column("device", execution_device_enum, nullable=False),
        sa.Column("container_id", sa.String(length=128), nullable=True),
        sa.Column("mlflow_experiment_id", sa.String(length=64), nullable=True),
        sa.Column("mlflow_run_id", sa.String(length=64), nullable=True),
        sa.Column("tensorboard_log_dir", sa.String(length=1024), nullable=True),
        sa.Column("log_storage_key", sa.String(length=1024), nullable=True),
        sa.Column("artifact_prefix", sa.String(length=1024), nullable=True),
        sa.Column("artifact_manifest", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("params_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("metrics_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("exit_code", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["generated_project_id"],
            ["generated_projects.id"],
            name="fk_execution_runs_generated_project_id_generated_projects",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["paper_id"], ["papers.id"], name="fk_execution_runs_paper_id_papers", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_execution_runs"),
        sa.UniqueConstraint(
            "generated_project_id", "version", name="uq_execution_runs_project_version"
        ),
    )

    op.create_index(
        "ix_execution_runs_generated_project_id", "execution_runs", ["generated_project_id"], if_not_exists=True
    )
    op.create_index("ix_execution_runs_paper_id", "execution_runs", ["paper_id"], if_not_exists=True)
    op.create_index("ix_execution_runs_status", "execution_runs", ["status"], if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_execution_runs_status", table_name="execution_runs", if_exists=True)
    op.drop_index("ix_execution_runs_paper_id", table_name="execution_runs", if_exists=True)
    op.drop_index("ix_execution_runs_generated_project_id", table_name="execution_runs", if_exists=True)
    op.drop_table("execution_runs")

    bind = op.get_bind()
    execution_device_enum.drop(bind, checkfirst=True)
    execution_run_status_enum.drop(bind, checkfirst=True)
