import uuid

from pydantic import BaseModel, Field

from app.schemas.rag import Citation, ConversationTurn


class OrchestratorQueryRequest(BaseModel):
    query: str = Field(min_length=1)
    paper_id: uuid.UUID | None = None
    history: list[ConversationTurn] = Field(default_factory=list)
    generate_full_project: bool = Field(
        default=False,
        description=(
            "Explicit intent flag: when true and `paper_id` is set, the Code "
            "Generator agent queues a full downloadable project instead of a "
            "short inline code snippet. Requires a completed knowledge "
            "extraction for the paper."
        ),
    )


class GeneratedProjectRef(BaseModel):
    """Pointer to a project generation queued during this orchestrator run."""

    id: uuid.UUID
    version: int


class OrchestratorAnswer(BaseModel):
    """Only the final answer + citations (and, if applicable, a pointer to a
    queued project generation) are ever returned - every agent's
    intermediate reasoning (plan, retrieval/graph context, draft notes,
    review notes) stays internal to the orchestrator run.
    """

    answer: str
    citations: list[Citation]
    generated_project: GeneratedProjectRef | None = None
