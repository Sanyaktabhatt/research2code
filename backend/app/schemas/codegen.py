import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.codegen.schemas import QualityReport
from app.models.generated_project import GeneratedProjectStatus


class GeneratedProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    paper_id: uuid.UUID
    knowledge_extraction_id: uuid.UUID
    version: int
    status: GeneratedProjectStatus
    framework: str
    model_provider: str | None
    model_name: str | None
    quality_score: float | None
    created_at: datetime


class GeneratedProjectDetailRead(GeneratedProjectRead):
    generation_params: dict
    file_manifest: list[str] | None
    quality_report: QualityReport | None
    error_message: str | None


class GeneratedProjectDownloadResponse(BaseModel):
    url: str
    expires_in_seconds: int
