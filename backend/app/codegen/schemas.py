import enum
import re

from pydantic import BaseModel, Field, field_validator

from app.agents.schemas import ExtractedKnowledge

_PROJECT_NAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")


class Framework(str, enum.Enum):
    PYTORCH = "pytorch"


class GenerationOptions(BaseModel):
    """User/caller-controlled knobs for one generation run. Every field has
    a sensible default so a bare `{}` from the API still produces a
    complete, runnable project.
    """

    framework: Framework = Framework.PYTORCH
    project_name: str = Field(default="generated-project", min_length=1, max_length=128)
    use_amp: bool = True
    use_ddp: bool = True
    use_tensorboard: bool = True
    use_mlflow: bool = True
    early_stopping: bool = True

    @field_validator("project_name")
    @classmethod
    def _validate_project_name(cls, value: str) -> str:
        # project_name is interpolated raw into JSON (notebook), YAML,
        # shell scripts and Dockerfiles by the templates - keep it to a
        # safe identifier-like charset so it can never break any of them.
        if not _PROJECT_NAME_PATTERN.match(value):
            raise ValueError(
                "project_name must start with a letter/digit and contain only "
                "letters, digits, hyphens and underscores"
            )
        return value


class ProjectGenerationSpec(BaseModel):
    """Everything the builder needs to render a full project. Pure data - no
    I/O, no DB/session objects - so it's trivially testable in isolation.
    """

    options: GenerationOptions
    extracted: ExtractedKnowledge
    graph_facts_text: str = ""
    research_notes: str = ""
    experiment_plan: str = ""


class GeneratedFile(BaseModel):
    path: str = Field(description="Project-relative path, e.g. 'train.py' or 'callbacks/checkpoint.py'")
    content: str


class GeneratedProjectFiles(BaseModel):
    files: list[GeneratedFile] = Field(default_factory=list)

    def get(self, path: str) -> str | None:
        for file in self.files:
            if file.path == path:
                return file.content
        return None

    def paths(self) -> list[str]:
        return [file.path for file in self.files]


class LLMGeneratedFile(BaseModel):
    """One file as produced by the LLM structured-output call in `llm_codegen`."""

    path: str = Field(description="Relative file path, e.g. 'model.py'")
    content: str = Field(description="Complete file content - no markdown fences, no truncation")


class LLMGeneratedFileSet(BaseModel):
    files: list[LLMGeneratedFile]


class QualityIssueSeverity(str, enum.Enum):
    ERROR = "error"
    WARNING = "warning"


class QualityIssue(BaseModel):
    category: str = Field(description="e.g. 'missing_file', 'broken_import', 'placeholder', 'dependency'")
    severity: QualityIssueSeverity
    message: str
    file_path: str | None = None


class QualityReport(BaseModel):
    score: float = Field(ge=0.0, le=1.0, description="1.0 = no issues found")
    issues: list[QualityIssue] = Field(default_factory=list)
