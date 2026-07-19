import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.execution_run import ExecutionDevice, ExecutionRunStatus


class TriggerExecutionRequest(BaseModel):
    device: ExecutionDevice = ExecutionDevice.CPU


class ExecutionRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    generated_project_id: uuid.UUID
    paper_id: uuid.UUID
    version: int
    status: ExecutionRunStatus
    execution_backend: str
    device: ExecutionDevice
    mlflow_run_id: str | None
    exit_code: int | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime


class ExecutionRunDetailRead(ExecutionRunRead):
    container_id: str | None
    mlflow_experiment_id: str | None
    tensorboard_log_dir: str | None
    log_storage_key: str | None
    artifact_prefix: str | None
    artifact_manifest: list[str] | None
    params_snapshot: dict | None
    metrics_summary: dict | None
    error_message: str | None


class TensorBoardUrlResponse(BaseModel):
    url: str


class LogDownloadResponse(BaseModel):
    url: str
    expires_in_seconds: int


class ComparisonRequest(BaseModel):
    execution_run_ids: list[uuid.UUID] = Field(min_length=2)
    primary_metric: str | None = Field(
        default=None, description="Metric key to rank runs by; auto-detected if omitted"
    )
    higher_is_better: bool = True


class ParameterDiff(BaseModel):
    key: str
    values: dict[str, str | None] = Field(description="execution_run_id -> stringified value")
    differs: bool


class MetricDiff(BaseModel):
    key: str
    values: dict[str, float | None] = Field(description="execution_run_id -> value")
    differs: bool


class ComparisonResult(BaseModel):
    execution_run_ids: list[uuid.UUID]
    parameter_diffs: list[ParameterDiff]
    metric_diffs: list[MetricDiff]
    best_run_id: uuid.UUID | None
    best_metric: str | None
    best_value: float | None
