from dataclasses import dataclass, field
from typing import Any

from app.agents.schemas import ExtractedKnowledge
from app.models.embedding import EmbeddingSourceType
from app.parser.schemas import ParsedPaper


@dataclass
class EmbeddingTarget:
    """One piece of text to embed, plus enough metadata to trace it back
    to its source object and filter on later."""

    source_type: EmbeddingSourceType
    source_ref: str
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


def build_paper_embedding_targets(parsed_paper: ParsedPaper) -> list[EmbeddingTarget]:
    """Builds embedding targets for a paper's sections, figures, tables and equations."""
    targets: list[EmbeddingTarget] = []

    for section in parsed_paper.sections:
        if not section.text.strip():
            continue
        targets.append(
            EmbeddingTarget(
                source_type=EmbeddingSourceType.SECTION,
                source_ref=f"section:{section.name}",
                content=section.text,
                metadata={"start_page": section.start_page, "end_page": section.end_page},
            )
        )

    for figure in parsed_paper.figures:
        content = figure.caption or f"Figure {figure.index + 1} on page {figure.page_number}"
        targets.append(
            EmbeddingTarget(
                source_type=EmbeddingSourceType.FIGURE_CAPTION,
                source_ref=f"figure:page{figure.page_number}:{figure.index}",
                content=content,
                metadata={"page_number": figure.page_number},
            )
        )

    for table in parsed_paper.tables:
        content = table.caption or table.raw_text or f"Table {table.index + 1} on page {table.page_number}"
        targets.append(
            EmbeddingTarget(
                source_type=EmbeddingSourceType.TABLE_DESCRIPTION,
                source_ref=f"table:page{table.page_number}:{table.index}",
                content=content,
                metadata={"page_number": table.page_number},
            )
        )

    for equation in parsed_paper.equations:
        if not equation.text.strip():
            continue
        targets.append(
            EmbeddingTarget(
                source_type=EmbeddingSourceType.EQUATION_DESCRIPTION,
                source_ref=f"equation:page{equation.page_number}:{equation.index}",
                content=equation.text,
                metadata={"page_number": equation.page_number},
            )
        )

    return targets


def build_knowledge_embedding_targets(extracted: ExtractedKnowledge) -> list[EmbeddingTarget]:
    """Builds embedding targets for every normalized entity in an extraction result."""
    targets: list[EmbeddingTarget] = []

    def add(entity_type: str, index: int, content: str, confidence: float) -> None:
        if not content.strip():
            return
        targets.append(
            EmbeddingTarget(
                source_type=EmbeddingSourceType.KNOWLEDGE_ENTITY,
                source_ref=f"entity:{entity_type}:{index}",
                content=content,
                metadata={"entity_type": entity_type, "confidence": confidence},
            )
        )

    if extracted.metadata:
        m = extracted.metadata
        add("metadata", 0, f"Title: {m.title}. Authors: {', '.join(m.authors)}.", m.confidence)

    if extracted.task_domain:
        td = extracted.task_domain
        add("task_domain", 0, f"Task: {td.task}. Domain: {td.domain}.", td.confidence)

    for i, dataset in enumerate(extracted.datasets):
        add("datasets", i, f"Dataset: {dataset.name}. {dataset.description or ''}".strip(), dataset.confidence)

    for i, step in enumerate(extracted.preprocessing_steps):
        add("preprocessing_steps", i, f"{step.name}: {step.description}", step.confidence)

    if extracted.model_architecture:
        arch = extracted.model_architecture
        add(
            "model_architecture",
            0,
            f"{arch.name} ({arch.family or 'unknown family'}): {arch.description or ''}".strip(),
            arch.confidence,
        )

    if extracted.training_pipeline:
        tp = extracted.training_pipeline
        add("training_pipeline", 0, tp.description, tp.confidence)

    for i, hp in enumerate(extracted.hyperparameters):
        add("hyperparameters", i, f"{hp.name} = {hp.value}", hp.confidence)

    if extracted.optimizer:
        opt = extracted.optimizer
        add("optimizer", 0, f"Optimizer: {opt.name}, learning_rate={opt.learning_rate}", opt.confidence)

    if extracted.scheduler:
        sch = extracted.scheduler
        add("scheduler", 0, f"Scheduler: {sch.name}. {sch.description or ''}".strip(), sch.confidence)

    for i, loss in enumerate(extracted.loss_functions):
        add("loss_functions", i, f"{loss.name}: {loss.description or ''}".strip(), loss.confidence)

    for i, aug in enumerate(extracted.augmentations):
        add("augmentations", i, f"{aug.name}: {aug.description or ''}".strip(), aug.confidence)

    for i, hw in enumerate(extracted.hardware_requirements):
        content = f"{hw.device_type} {hw.model_name or ''} x{hw.count or ''}".strip()
        add("hardware_requirements", i, content, hw.confidence)

    for i, metric in enumerate(extracted.evaluation_metrics):
        add("evaluation_metrics", i, f"{metric.name}: {metric.description or ''}".strip(), metric.confidence)

    for i, result in enumerate(extracted.reported_results):
        content = f"{result.metric_name} = {result.value}"
        if result.dataset:
            content += f" on {result.dataset}"
        if result.split:
            content += f" ({result.split})"
        add("reported_results", i, content, result.confidence)

    for i, ablation in enumerate(extracted.ablation_studies):
        content = f"{ablation.variant}: {ablation.description}"
        if ablation.result:
            content += f" -> {ablation.result}"
        add("ablation_studies", i, content, ablation.confidence)

    for i, limitation in enumerate(extracted.limitations):
        add("limitations", i, limitation.description, limitation.confidence)

    for i, future_work in enumerate(extracted.future_work):
        add("future_work", i, future_work.description, future_work.confidence)

    for i, resource in enumerate(extracted.external_resources):
        content = f"{resource.resource_type}: {resource.name}"
        if resource.url:
            content += f" ({resource.url})"
        add("external_resources", i, content, resource.confidence)

    return targets
