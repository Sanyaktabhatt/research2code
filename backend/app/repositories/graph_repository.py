from neo4j import AsyncDriver

from app.observability.metrics import neo4j_query_duration_seconds, observe_duration
from app.schemas.graph import GraphNode, GraphRelationship
from app.services.knowledge_graph_builder import GraphOperation


class GraphRepository:
    """Thin async data-access layer over the Neo4j driver.

    Pure Cypher execution only - graph-construction logic lives in
    `app.services.knowledge_graph_builder` and rendering/business logic in
    `app.services.graph_service`, so this stays swappable/testable in
    isolation from both.
    """

    def __init__(self, driver: AsyncDriver) -> None:
        self.driver = driver

    async def run_operations(self, operations: list[GraphOperation]) -> None:
        async def _write(tx):
            for op in operations:
                await tx.run(op.cypher, op.params)

        async with self.driver.session() as session:
            with observe_duration(neo4j_query_duration_seconds, operation="write"):
                await session.execute_write(_write)

    async def get_extraction_subgraph(
        self, extraction_id: str
    ) -> tuple[list[GraphNode], list[GraphRelationship]]:
        """Returns the full snapshot for one extraction version.

        Every relationship created for a version carries an `extraction_id`
        property (see `knowledge_graph_builder`), so a single pattern match
        on that property yields the whole isolated snapshot.
        """

        async def _read(tx):
            result = await tx.run(
                "MATCH (a)-[r {extraction_id: $extraction_id}]->(b) RETURN a, r, b",
                {"extraction_id": extraction_id},
            )
            return [record async for record in result]

        async with self.driver.session() as session:
            with observe_duration(neo4j_query_duration_seconds, operation="read"):
                records = await session.execute_read(_read)

        nodes_by_key: dict[str, GraphNode] = {}
        relationships: list[GraphRelationship] = []

        for record in records:
            start_node, rel, end_node = record["a"], record["r"], record["b"]

            for node in (start_node, end_node):
                key = node.get("key")
                if key and key not in nodes_by_key:
                    nodes_by_key[key] = GraphNode(
                        key=key, labels=list(node.labels), properties=dict(node)
                    )

            relationships.append(
                GraphRelationship(
                    type=rel.type,
                    start_key=start_node.get("key"),
                    end_key=end_node.get("key"),
                    properties=dict(rel),
                )
            )

        return list(nodes_by_key.values()), relationships
