import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.agents.schemas import ExtractedKnowledge
from app.models.knowledge import KnowledgeExtractionStatus


class KnowledgeExtractionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: uuid.UUID
    paper_id: uuid.UUID
    version: int
    status: KnowledgeExtractionStatus
    model_provider: str | None
    model_name: str | None
    created_at: datetime


class KnowledgeExtractionDetailRead(KnowledgeExtractionRead):
    error_message: str | None
    extracted_data: ExtractedKnowledge | None
