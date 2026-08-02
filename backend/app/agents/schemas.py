from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

# Every list field on ExtractedKnowledge - module-level, not a class
# attribute, since Pydantic v2 treats an unannotated leading-underscore
# class attribute as a private model attribute (wrapped in
# `ModelPrivateAttr`), not a plain constant accessible via `cls._NAME`.
_EXTRACTED_KNOWLEDGE_LIST_FIELDS = (
    "datasets",
    "preprocessing_steps",
    "hyperparameters",
    "loss_functions",
    "augmentations",
    "hardware_requirements",
    "evaluation_metrics",
    "reported_results",
    "ablation_studies",
    "limitations",
    "future_work",
    "external_resources",
)


class ConfidenceMixin(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    confidence: float = Field(
        ge=0.0, le=1.0, description="Model's confidence that this extracted value is correct, 0-1."
    )


class PaperMetadata(ConfidenceMixin):
    title: str
    authors: list[str] = Field(default_factory=list)
    publication_year: int | None = None
    venue: str | None = None
    arxiv_id: str | None = None
    doi: str | None = None


class TaskDomain(ConfidenceMixin):
    task: str = Field(description="The specific ML task, e.g. 'image classification'")
    domain: str = Field(description="The broader field/domain, e.g. 'computer vision'")
    subdomain: str | None = None


class Dataset(ConfidenceMixin):
    name: str
    description: str | None = None
    size: str | None = Field(default=None, description="e.g. '1.2M images', '50k rows'")
    url: str | None = None
    split_info: str | None = Field(default=None, description="e.g. 'train/val/test = 80/10/10'")


class PreprocessingStep(ConfidenceMixin):
    name: str
    description: str


class ModelLayer(ConfidenceMixin):
    name: str
    layer_type: str | None = Field(default=None, description="e.g. 'convolution', 'attention', 'linear'")
    description: str | None = None


class ModelArchitecture(ConfidenceMixin):
    name: str
    family: str | None = Field(default=None, description="e.g. 'transformer', 'cnn', 'rnn', 'gan'")
    description: str | None = None
    num_parameters: str | None = None
    layers: list[ModelLayer] = Field(default_factory=list)


class TrainingPipeline(ConfidenceMixin):
    description: str
    epochs: int | None = None
    batch_size: int | None = None
    training_time: str | None = None


class Hyperparameter(ConfidenceMixin):
    name: str
    value: str


class Optimizer(ConfidenceMixin):
    name: str
    learning_rate: str | None = None
    weight_decay: str | None = None
    other_params: dict[str, str] = Field(default_factory=dict)


class Scheduler(ConfidenceMixin):
    name: str
    description: str | None = None


class LossFunction(ConfidenceMixin):
    name: str
    description: str | None = None


class Augmentation(ConfidenceMixin):
    name: str
    description: str | None = None


class HardwareRequirement(ConfidenceMixin):
    device_type: str = Field(description="e.g. 'GPU', 'TPU', 'CPU'")
    model_name: str | None = Field(default=None, description="e.g. 'NVIDIA A100'")
    count: int | None = None
    memory: str | None = None


class EvaluationMetric(ConfidenceMixin):
    name: str
    description: str | None = None


class ReportedResult(ConfidenceMixin):
    metric_name: str
    value: str
    dataset: str | None = None
    split: str | None = Field(default=None, description="e.g. 'test', 'validation'")
    notes: str | None = None


class AblationStudy(ConfidenceMixin):
    variant: str = Field(description="What was changed/removed for this ablation")
    description: str
    result: str | None = None


class Limitation(ConfidenceMixin):
    description: str


class FutureWork(ConfidenceMixin):
    description: str


class ExternalResource(ConfidenceMixin):
    name: str
    resource_type: str = Field(description="e.g. 'repository', 'pretrained_model'")
    url: str | None = None
    description: str | None = None


class ExtractedKnowledge(BaseModel):
    """Structured knowledge extracted from a single research paper.

    Every nested entity carries its own `confidence` score (see
    `ConfidenceMixin`); singular sections are optional and should be omitted
    entirely by the LLM rather than filled with a low-confidence guess when
    the paper does not contain that information.
    """

    model_config = ConfigDict(protected_namespaces=())

    @model_validator(mode="before")
    @classmethod
    def _coerce_null_lists_to_empty(cls, data: Any) -> Any:
        # `Field(default_factory=list)` only applies when a key is *absent*
        # from the input - some models (reproduced with Qwen 2.5 72B via
        # OpenRouter) instead return an explicit `"datasets": null` etc. for
        # every list field it found nothing for, which fails validation
        # outright (`Input should be a valid list ... NoneType`) since `None`
        # is a present-but-wrong value, not a missing key. That crash isn't
        # in this task's `autoretry_for` list, so it failed the whole
        # extraction rather than the (harmless) "found nothing" it actually
        # meant. A `null` for a *singular* optional field (e.g.
        # `model_architecture`) is left untouched - `| None` already accepts
        # it correctly there.
        if not isinstance(data, dict):
            return data
        for field in _EXTRACTED_KNOWLEDGE_LIST_FIELDS:
            if data.get(field) is None and field in data:
                data[field] = []
        return data

    metadata: PaperMetadata | None = None
    task_domain: TaskDomain | None = None
    datasets: list[Dataset] = Field(default_factory=list)
    preprocessing_steps: list[PreprocessingStep] = Field(default_factory=list)
    model_architecture: ModelArchitecture | None = None
    training_pipeline: TrainingPipeline | None = None
    hyperparameters: list[Hyperparameter] = Field(default_factory=list)
    optimizer: Optimizer | None = None
    scheduler: Scheduler | None = None
    loss_functions: list[LossFunction] = Field(default_factory=list)
    augmentations: list[Augmentation] = Field(default_factory=list)
    hardware_requirements: list[HardwareRequirement] = Field(default_factory=list)
    evaluation_metrics: list[EvaluationMetric] = Field(default_factory=list)
    reported_results: list[ReportedResult] = Field(default_factory=list)
    ablation_studies: list[AblationStudy] = Field(default_factory=list)
    limitations: list[Limitation] = Field(default_factory=list)
    future_work: list[FutureWork] = Field(default_factory=list)
    external_resources: list[ExternalResource] = Field(default_factory=list)
