import uuid

from app.models.user import User
from app.services.graph_service import GraphService


class GraphAgent:
    """Wraps the Neo4j-backed `GraphService` so the orchestrator can pull
    structured graph facts as one step, combined alongside vector retrieval
    when building context (see `app.workflows.graph_builder`).
    """

    def __init__(self, graph_service: GraphService) -> None:
        self.graph_service = graph_service

    async def run(self, paper_id: uuid.UUID | None, owner: User) -> str:
        if paper_id is None:
            return ""
        return await self.graph_service.get_paper_facts_text(paper_id, owner)
