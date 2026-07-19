"""Pure SQLAlchemy statement builders for embedding search.

These return plain `Select` objects with no I/O, so the exact same query
logic can be executed either via `AsyncSession.execute` (the API/service
layer) or a synchronous `Session.execute` (Celery workers) without
duplicating the query itself.
"""

import uuid

from sqlalchemy import Select, func, select

from app.models.embedding import Embedding, EmbeddingSourceType
from app.models.paper import Paper
from app.models.project import Project


def _scope_to_owner(stmt: Select, owner_id: uuid.UUID, is_admin: bool) -> Select:
    stmt = stmt.join(Paper, Paper.id == Embedding.paper_id).join(Project, Project.id == Paper.project_id)
    if not is_admin:
        stmt = stmt.where(Project.owner_id == owner_id)
    return stmt


def _apply_filters(
    stmt: Select,
    source_types: list[EmbeddingSourceType] | None,
    paper_id: uuid.UUID | None,
) -> Select:
    if source_types:
        stmt = stmt.where(Embedding.source_type.in_(source_types))
    if paper_id is not None:
        stmt = stmt.where(Embedding.paper_id == paper_id)
    return stmt


def similarity_search_stmt(
    query_vector: list[float],
    owner_id: uuid.UUID,
    is_admin: bool,
    limit: int,
    source_types: list[EmbeddingSourceType] | None = None,
    paper_id: uuid.UUID | None = None,
) -> Select:
    """Cosine similarity, best (smallest distance) first."""
    distance = Embedding.embedding.cosine_distance(query_vector)
    stmt = select(Embedding, distance.label("score"))
    stmt = _scope_to_owner(stmt, owner_id, is_admin)
    stmt = _apply_filters(stmt, source_types, paper_id)
    return stmt.order_by(distance.asc()).limit(limit)


def keyword_search_stmt(
    query_text: str,
    owner_id: uuid.UUID,
    is_admin: bool,
    limit: int,
    source_types: list[EmbeddingSourceType] | None = None,
    paper_id: uuid.UUID | None = None,
) -> Select:
    """PostgreSQL full-text search, best (highest rank) first."""
    tsquery = func.plainto_tsquery("english", query_text)
    tsvector = func.to_tsvector("english", Embedding.content)
    rank = func.ts_rank(tsvector, tsquery)

    stmt = select(Embedding, rank.label("score")).where(tsvector.op("@@")(tsquery))
    stmt = _scope_to_owner(stmt, owner_id, is_admin)
    stmt = _apply_filters(stmt, source_types, paper_id)
    return stmt.order_by(rank.desc()).limit(limit)
