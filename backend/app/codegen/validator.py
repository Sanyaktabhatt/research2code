import ast
import re
import sys

import yaml

from app.codegen.dependency_resolver import IMPORT_NAME_TO_PACKAGE, package_names
from app.codegen.schemas import (
    GeneratedProjectFiles,
    GenerationOptions,
    QualityIssue,
    QualityIssueSeverity,
    QualityReport,
)

REQUIRED_FILES = {
    "train.py",
    "evaluate.py",
    "infer.py",
    "model.py",
    "dataset.py",
    "dataloader.py",
    "losses.py",
    "metrics.py",
    "optimizer.py",
    "scheduler.py",
    "config.yaml",
    "requirements.txt",
    "Dockerfile",
    "docker-compose.yml",
    "README.md",
    "LICENSE",
    ".gitignore",
}
REQUIRED_DIRECTORIES = {"tests", "notebooks", "scripts", "configs", "callbacks", "utils"}

_PLACEHOLDER_PATTERN = re.compile(r"\{\{.*?\}\}|\{%.*?%\}")
_TODO_PATTERN = re.compile(r"#\s*(TODO|FIXME)\b", re.IGNORECASE)

_ERROR_PENALTY = 0.15
_WARNING_PENALTY = 0.05


class CodeQualityValidator:
    """Automated review of a generated project: missing files, broken
    imports, unresolved template placeholders, and dependency issues.
    Produces a `QualityReport` with a 0-1 confidence score.
    """

    def validate(self, files: GeneratedProjectFiles, options: GenerationOptions) -> QualityReport:
        issues: list[QualityIssue] = []

        issues.extend(self._check_missing_files(files))
        issues.extend(self._check_python_files(files, options))
        issues.extend(self._check_placeholders(files))
        issues.extend(self._check_config_yaml(files))

        score = self._score(issues)
        return QualityReport(score=score, issues=issues)

    def _check_missing_files(self, files: GeneratedProjectFiles) -> list[QualityIssue]:
        issues: list[QualityIssue] = []
        present_paths = set(files.paths())

        for required in sorted(REQUIRED_FILES - present_paths):
            issues.append(
                QualityIssue(
                    category="missing_file",
                    severity=QualityIssueSeverity.ERROR,
                    message=f"Required file '{required}' was not generated",
                    file_path=required,
                )
            )

        present_dirs = {path.split("/", 1)[0] for path in present_paths if "/" in path}
        for required_dir in sorted(REQUIRED_DIRECTORIES - present_dirs):
            issues.append(
                QualityIssue(
                    category="missing_directory",
                    severity=QualityIssueSeverity.ERROR,
                    message=f"Required directory '{required_dir}/' has no generated files",
                    file_path=required_dir,
                )
            )

        return issues

    def _check_python_files(
        self, files: GeneratedProjectFiles, options: GenerationOptions
    ) -> list[QualityIssue]:
        issues: list[QualityIssue] = []
        python_files = [f for f in files.files if f.path.endswith(".py")]
        local_modules = self._local_module_names(files)
        declared_packages = package_names(options)
        stdlib_modules = set(sys.stdlib_module_names)

        for file in python_files:
            try:
                tree = ast.parse(file.content, filename=file.path)
            except SyntaxError as exc:
                issues.append(
                    QualityIssue(
                        category="syntax_error",
                        severity=QualityIssueSeverity.ERROR,
                        message=f"Syntax error: {exc.msg} (line {exc.lineno})",
                        file_path=file.path,
                    )
                )
                continue

            for top_level_module in self._imported_top_level_modules(tree):
                resolved_package = IMPORT_NAME_TO_PACKAGE.get(top_level_module, top_level_module)
                if (
                    top_level_module in stdlib_modules
                    or top_level_module in local_modules
                    or resolved_package.lower() in declared_packages
                ):
                    continue

                issues.append(
                    QualityIssue(
                        category="dependency_issue",
                        severity=QualityIssueSeverity.WARNING,
                        message=(
                            f"Imports '{top_level_module}', which is neither a stdlib module, a "
                            "project-local module, nor declared in requirements.txt"
                        ),
                        file_path=file.path,
                    )
                )

        return issues

    def _check_placeholders(self, files: GeneratedProjectFiles) -> list[QualityIssue]:
        issues: list[QualityIssue] = []

        for file in files.files:
            if _PLACEHOLDER_PATTERN.search(file.content):
                issues.append(
                    QualityIssue(
                        category="unresolved_placeholder",
                        severity=QualityIssueSeverity.ERROR,
                        message="Unrendered template placeholder (e.g. '{{ ... }}') found in generated output",
                        file_path=file.path,
                    )
                )

            todo_count = len(_TODO_PATTERN.findall(file.content))
            if todo_count:
                issues.append(
                    QualityIssue(
                        category="todo_marker",
                        severity=QualityIssueSeverity.WARNING,
                        message=f"{todo_count} TODO/FIXME marker(s) left for manual follow-up",
                        file_path=file.path,
                    )
                )

        return issues

    def _check_config_yaml(self, files: GeneratedProjectFiles) -> list[QualityIssue]:
        content = files.get("config.yaml")
        if content is None:
            return []

        try:
            yaml.safe_load(content)
        except yaml.YAMLError as exc:
            return [
                QualityIssue(
                    category="invalid_config",
                    severity=QualityIssueSeverity.ERROR,
                    message=f"config.yaml is not valid YAML: {exc}",
                    file_path="config.yaml",
                )
            ]

        return []

    def _local_module_names(self, files: GeneratedProjectFiles) -> set[str]:
        names = set()
        for path in files.paths():
            if not path.endswith(".py"):
                continue
            top_level = path.split("/", 1)[0]
            names.add(top_level[:-3] if top_level.endswith(".py") else top_level)
        return names

    def _imported_top_level_modules(self, tree: ast.Module) -> set[str]:
        modules: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    modules.add(alias.name.split(".")[0])
            elif isinstance(node, ast.ImportFrom):
                if node.level and node.level > 0:
                    continue  # relative import - not a top-level dependency
                if node.module:
                    modules.add(node.module.split(".")[0])
        return modules

    def _score(self, issues: list[QualityIssue]) -> float:
        penalty = sum(
            _ERROR_PENALTY if issue.severity == QualityIssueSeverity.ERROR else _WARNING_PENALTY
            for issue in issues
        )
        return max(0.0, min(1.0, 1.0 - penalty))
