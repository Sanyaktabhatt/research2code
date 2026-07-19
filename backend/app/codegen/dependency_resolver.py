"""Resolves a generated project's `requirements.txt` content from its
framework + options. Kept separate from templates so the validator (and any
future tooling) can call the same resolution logic without re-rendering
Jinja2.
"""

from app.codegen.schemas import Framework, GenerationOptions

_BASE_REQUIREMENTS: dict[Framework, list[str]] = {
    Framework.PYTORCH: [
        "torch>=2.2,<3.0",
        "torchvision>=0.17,<1.0",
        "numpy>=1.26,<2.0",
        "pyyaml>=6.0,<7.0",
        "tqdm>=4.66,<5.0",
    ],
}

_OPTIONAL_REQUIREMENTS = {
    "tensorboard": "tensorboard>=2.16,<3.0",
    "mlflow": "mlflow>=2.11,<3.0",
}

_DEV_REQUIREMENTS = [
    "pytest>=8.0,<9.0",
    "ruff>=0.4,<1.0",
]

# Packages whose importable module name differs from their PyPI/requirements
# name - used by the validator to avoid false-positive "undeclared
# dependency" warnings (e.g. `import yaml` is provided by the `pyyaml`
# package).
IMPORT_NAME_TO_PACKAGE = {
    "yaml": "pyyaml",
}


def resolve_requirements(options: GenerationOptions) -> list[str]:
    """Returns the ordered list of pinned requirement lines for one project."""
    if options.framework not in _BASE_REQUIREMENTS:
        raise ValueError(f"Unsupported framework: {options.framework}")

    requirements = list(_BASE_REQUIREMENTS[options.framework])

    if options.use_tensorboard:
        requirements.append(_OPTIONAL_REQUIREMENTS["tensorboard"])
    if options.use_mlflow:
        requirements.append(_OPTIONAL_REQUIREMENTS["mlflow"])

    requirements.extend(_DEV_REQUIREMENTS)
    return requirements


def package_names(options: GenerationOptions) -> set[str]:
    """Bare package names (no version specifiers), for the validator's
    import/dependency cross-check.
    """
    names = set()
    for line in resolve_requirements(options):
        name = line.split(">=")[0].split("==")[0].split("<")[0].strip()
        names.add(name.lower())
    return names
