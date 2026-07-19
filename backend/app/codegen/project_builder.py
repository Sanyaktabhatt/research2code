from datetime import datetime, timezone

from app.agents.schemas import ExtractedKnowledge
from app.codegen.dependency_resolver import resolve_requirements
from app.codegen.llm_codegen import LLMCodeGenerator
from app.codegen.schemas import (
    Framework,
    GeneratedFile,
    GeneratedProjectFiles,
    GenerationOptions,
    ProjectGenerationSpec,
)
from app.codegen.template_engine import TemplateEngine

# (template name, output path) - a template can be rendered to more than one
# output path (e.g. config.yaml also ships as a named profile under configs/).
_PYTORCH_MANIFEST: list[tuple[str, str]] = [
    (".gitignore", ".gitignore"),
    ("LICENSE", "LICENSE"),
    ("README.md", "README.md"),
    ("Dockerfile", "Dockerfile"),
    ("docker-compose.yml", "docker-compose.yml"),
    ("requirements.txt", "requirements.txt"),
    ("config.yaml", "config.yaml"),
    ("config.yaml", "configs/default.yaml"),
    ("train.py", "train.py"),
    ("evaluate.py", "evaluate.py"),
    ("infer.py", "infer.py"),
    ("dataloader.py", "dataloader.py"),
    ("optimizer.py", "optimizer.py"),
    ("scheduler.py", "scheduler.py"),
    ("callbacks/__init__.py", "callbacks/__init__.py"),
    ("callbacks/checkpoint.py", "callbacks/checkpoint.py"),
    ("callbacks/early_stopping.py", "callbacks/early_stopping.py"),
    ("callbacks/tensorboard_logger.py", "callbacks/tensorboard_logger.py"),
    ("callbacks/mlflow_logger.py", "callbacks/mlflow_logger.py"),
    ("utils/__init__.py", "utils/__init__.py"),
    ("utils/seed.py", "utils/seed.py"),
    ("utils/logging.py", "utils/logging.py"),
    ("utils/distributed.py", "utils/distributed.py"),
    ("tests/__init__.py", "tests/__init__.py"),
    ("tests/test_model.py", "tests/test_model.py"),
    ("tests/test_dataset.py", "tests/test_dataset.py"),
    ("scripts/train.sh", "scripts/train.sh"),
    ("scripts/evaluate.sh", "scripts/evaluate.sh"),
    ("notebooks/exploration.ipynb", "notebooks/exploration.ipynb"),
]

# Templates are stored without a leading dot (Jinja2/FileSystemLoader dislikes
# some dotfile handling across platforms); mapped to their real dotfile name
# in the manifest's output path instead.
_TEMPLATE_FILENAME_OVERRIDES = {".gitignore": "gitignore"}

_MANIFESTS: dict[Framework, list[tuple[str, str]]] = {
    Framework.PYTORCH: _PYTORCH_MANIFEST,
}


def _build_template_context(spec: ProjectGenerationSpec) -> dict:
    extracted: ExtractedKnowledge = spec.extracted
    options: GenerationOptions = spec.options

    arch = extracted.model_architecture
    optimizer = extracted.optimizer
    scheduler = extracted.scheduler
    training = extracted.training_pipeline
    dataset = extracted.datasets[0] if extracted.datasets else None

    return {
        "options": options,
        "project_name": options.project_name,
        "year": datetime.now(timezone.utc).year,
        "model_name": arch.name if arch else "Model",
        "num_classes": "null  # TODO: set the number of output classes/targets",
        "optimizer_name": optimizer.name if optimizer else "AdamW",
        "learning_rate": _quoted(optimizer.learning_rate if optimizer else None, default="1e-3"),
        "weight_decay": _quoted(optimizer.weight_decay if optimizer else None, default="0.0"),
        "scheduler_name": scheduler.name if scheduler else "cosine",
        "batch_size": training.batch_size if training and training.batch_size else 32,
        "epochs": training.epochs if training and training.epochs else 50,
        "dataset_name": dataset.name if dataset else "CustomDataset",
        "hyperparameters": [{"name": hp.name, "value": hp.value} for hp in extracted.hyperparameters],
        "requirements": resolve_requirements(options),
    }


def _quoted(value: str | None, default: str) -> str:
    # Hyperparameter values are extracted as free-text strings (e.g. "1e-4",
    # "cosine decay from 1e-3"); render as YAML-safe unquoted numbers when
    # they parse as one, otherwise fall back to the default numeric literal.
    if value is None:
        return default
    try:
        float(value)
    except ValueError:
        return default
    return value


class ProjectBuilder:
    """Assembles a full, runnable project from deterministic templates plus
    the four LLM-generated, paper-specific source files.
    """

    def __init__(self, llm_generator: LLMCodeGenerator | None = None) -> None:
        self.llm_generator = llm_generator or LLMCodeGenerator()

    def build(self, spec: ProjectGenerationSpec) -> GeneratedProjectFiles:
        framework = spec.options.framework
        manifest = _MANIFESTS.get(framework)
        if manifest is None:
            raise ValueError(f"Unsupported framework: {framework}")

        engine = TemplateEngine(framework)
        context = _build_template_context(spec)

        files: list[GeneratedFile] = []
        for template_name, output_path in manifest:
            source_name = _TEMPLATE_FILENAME_OVERRIDES.get(template_name, template_name)
            content = engine.render(f"{source_name}.j2", context)
            files.append(GeneratedFile(path=output_path, content=content))

        llm_files = self.llm_generator.generate(
            research_notes=spec.research_notes,
            retrieval_context="",
            graph_facts_text=spec.graph_facts_text,
        )
        files.extend(llm_files)

        return GeneratedProjectFiles(files=files)
