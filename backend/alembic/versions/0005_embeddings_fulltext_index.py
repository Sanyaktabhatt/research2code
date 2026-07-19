"""add full-text search index on embeddings.content

Revision ID: 0005_embeddings_fulltext_index
Revises: 0004_embeddings
Create Date: 2026-07-05

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005_embeddings_fulltext_index"
down_revision: Union[str, None] = "0004_embeddings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # A functional GIN index over to_tsvector(content) - keyword fallback search
    # (used by the RAG retrieval service) filters on this exact expression.
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_embeddings_content_fts "
        "ON embeddings USING gin (to_tsvector('english', content))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_embeddings_content_fts")
