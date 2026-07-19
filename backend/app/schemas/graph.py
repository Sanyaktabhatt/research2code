import uuid

from pydantic import BaseModel


class GraphNode(BaseModel):
    key: str
    labels: list[str]
    properties: dict


class GraphRelationship(BaseModel):
    type: str
    start_key: str
    end_key: str
    properties: dict


class GraphSnapshotResponse(BaseModel):
    paper_id: uuid.UUID
    knowledge_extraction_id: uuid.UUID
    version: int
    nodes: list[GraphNode]
    relationships: list[GraphRelationship]


class GraphRebuildResponse(BaseModel):
    paper_id: uuid.UUID
    knowledge_extraction_id: uuid.UUID
    queued: bool = True
