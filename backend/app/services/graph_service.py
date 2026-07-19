import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.config.neo4j_client import async_neo4j_driver
from app.execution.celery_tasks import build_knowledge_graph_task
from app.models.knowledge import KnowledgeExtraction, KnowledgeExtractionStatus
from app.models.user import User
from app.repositories.graph_repository import GraphRepository
from app.repositories.knowledge_repository import KnowledgeExtractionRepository
from app.repositories.paper_repository import PaperRepository
from app.schemas.graph import GraphNode, GraphSnapshotResponse
from app.services.project_service import ProjectService
from app.utils.exceptions import (
    KnowledgeExtractionNotCompletedError,
    KnowledgeExtractionNotFoundError,
    PaperNotFoundError,
)


class GraphService:
    """Builds and queries the Neo4j knowledge graph independently of the
    vector index - `get_paper_facts_text` is the one place graph traversal
    results get folded back into LLM context (used by the orchestrator's
    Graph Agent), everything else here is a plain, vector-search-free query.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.graph_repository = GraphRepository(async_neo4j_driver)
        self.paper_repository = PaperRepository(session)
        self.knowledge_repository = KnowledgeExtractionRepository(session)
        self.project_service = ProjectService(session)

    async def trigger_build(self, extraction_id: uuid.UUID, owner: User) -> KnowledgeExtraction:
        extraction = await self.knowledge_repository.get_by_id(extraction_id)
        if extraction is None:
            raise KnowledgeExtractionNotFoundError(extraction_id)

        await self._get_owned_paper(extraction.paper_id, owner)

        if extraction.status != KnowledgeExtractionStatus.COMPLETED:
            raise KnowledgeExtractionNotCompletedError(extraction_id)

        build_knowledge_graph_task.delay(str(extraction_id))
        return extraction

    async def get_paper_graph(
        self, paper_id: uuid.UUID, owner: User, version: int | None = None
    ) -> GraphSnapshotResponse:
        await self._get_owned_paper(paper_id, owner)
        extraction = await self._resolve_extraction(paper_id, version)

        nodes, relationships = await self.graph_repository.get_extraction_subgraph(str(extraction.id))

        return GraphSnapshotResponse(
            paper_id=paper_id,
            knowledge_extraction_id=extraction.id,
            version=extraction.version,
            nodes=nodes,
            relationships=relationships,
        )

    async def get_paper_facts_text(self, paper_id: uuid.UUID, owner: User) -> str:
        """Renders the latest completed extraction's graph as compact text
        for use as LLM context. Returns "" if no graph has been built yet -
        callers should treat that as "no graph facts available", not an error.
        """
        await self._get_owned_paper(paper_id, owner)

        extraction = await self.knowledge_repository.get_latest(paper_id)
        if extraction is None or extraction.status != KnowledgeExtractionStatus.COMPLETED:
            return ""

        nodes, _relationships = await self.graph_repository.get_extraction_subgraph(str(extraction.id))
        return self._render_facts(nodes)

    async def _resolve_extraction(
        self, paper_id: uuid.UUID, version: int | None
    ) -> KnowledgeExtraction:
        extraction = (
            await self.knowledge_repository.get_by_paper_and_version(paper_id, version)
            if version is not None
            else await self.knowledge_repository.get_latest(paper_id)
        )
        if extraction is None:
            raise KnowledgeExtractionNotFoundError(f"{paper_id} (version {version or 'latest'})")
        if extraction.status != KnowledgeExtractionStatus.COMPLETED:
            raise KnowledgeExtractionNotCompletedError(extraction.id)
        return extraction

    async def _get_owned_paper(self, paper_id: uuid.UUID, owner: User):
        paper = await self.paper_repository.get_by_id(paper_id)
        if paper is None:
            raise PaperNotFoundError(paper_id)

        await self.project_service.get_project(paper.project_id, owner)
        return paper

    @staticmethod
    def _render_facts(nodes: list[GraphNode]) -> str:
        by_label: dict[str, list[GraphNode]] = {}
        for node in nodes:
            for label in node.labels:
                if label == "Paper":
                    continue
                by_label.setdefault(label, []).append(node)

        if not by_label:
            return ""

        lines: list[str] = []
        for label, items in by_label.items():
            lines.append(f"{label}:")
            for item in items:
                props = {
                    key: value
                    for key, value in item.properties.items()
                    if key != "key" and value not in (None, "", [])
                }
                summary = ", ".join(f"{key}={value}" for key, value in props.items())
                lines.append(f"  - {summary}")

        return "\n".join(lines)
