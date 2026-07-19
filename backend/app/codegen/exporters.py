import io
import zipfile
from abc import ABC, abstractmethod

from app.codegen.schemas import GeneratedProjectFiles


class ProjectExporter(ABC):
    """Abstract interface for shipping a generated project somewhere.

    `ZipExporter` is the only concrete implementation today. A future
    `GitHubExporter` (push directly to a repository) implements the same
    interface, so `CodeGenerationService` never has to change to support a
    new export target - only the exporter passed to it changes.
    """

    @abstractmethod
    def export(self, files: GeneratedProjectFiles) -> bytes: ...


class ZipExporter(ProjectExporter):
    """Packages every generated file into a single in-memory ZIP archive."""

    def export(self, files: GeneratedProjectFiles) -> bytes:
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
            for file in files.files:
                archive.writestr(file.path, file.content)
        return buffer.getvalue()


class GitHubExporter(ProjectExporter):
    """Future: push the generated project directly to a GitHub repository.

    Deliberately unimplemented - wiring this up requires a GitHub App/OAuth
    credential flow that does not exist in this codebase yet. The interface
    is ready so `CodeGenerationService` can adopt it later without any
    further changes to the generation pipeline.
    """

    def __init__(self, repo_full_name: str, access_token: str) -> None:
        self.repo_full_name = repo_full_name
        self.access_token = access_token

    def export(self, files: GeneratedProjectFiles) -> bytes:
        raise NotImplementedError(
            "GitHub export is not implemented yet - see ProjectExporter/GitHubExporter docstring"
        )
