from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined

from app.codegen.schemas import Framework

_TEMPLATES_ROOT = Path(__file__).parent / "templates"


class TemplateEngine:
    """Thin Jinja2 wrapper scoped to one framework's template directory.

    Adding a new framework (TensorFlow, JAX, ...) means adding
    `app/codegen/templates/<framework>/` with matching template names -
    nothing in `ProjectBuilder`, the validator, the service, or the Celery
    task needs to change; only `Framework` and the per-framework template
    directory grow.
    """

    def __init__(self, framework: Framework) -> None:
        template_dir = _TEMPLATES_ROOT / framework.value
        if not template_dir.is_dir():
            raise ValueError(f"No templates found for framework '{framework.value}' at {template_dir}")

        self._env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            undefined=StrictUndefined,
            trim_blocks=True,
            lstrip_blocks=True,
            keep_trailing_newline=True,
            autoescape=False,
        )

    def render(self, template_name: str, context: dict) -> str:
        template = self._env.get_template(template_name)
        return template.render(**context)
