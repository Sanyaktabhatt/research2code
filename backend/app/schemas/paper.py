import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.paper import PaperProcessingStatus
from app.parser.schemas import ParsedPaper


class PaperRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    original_filename: str
    content_type: str | None
    size_bytes: int
    status: PaperProcessingStatus
    created_at: datetime


class PaperDetailRead(PaperRead):
    error_message: str | None
    parsed_data: ParsedPaper | None
