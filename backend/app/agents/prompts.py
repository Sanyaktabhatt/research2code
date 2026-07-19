from app.config.settings import settings
from app.parser.schemas import ParsedPaper

# Section ordering mirrors app.parser.section_extractor's heading detection
# order, plus "title" which is always emitted first by that extractor.
_SECTION_ORDER = ("title", "abstract", "introduction", "methodology", "experiments", "results", "references")

SYSTEM_PROMPT = """\
You are a meticulous machine learning research analyst. You extract structured \
knowledge strictly from the text of a research paper provided to you.

Rules:
- Only use information that is explicitly stated or strongly implied by the \
provided text. Do not invent facts.
- Every extracted entity has a `confidence` field (0-1). Set it honestly: \
1.0 for information stated verbatim and unambiguous, lower for anything \
inferred, paraphrased, or partially stated.
- If a field or entire section cannot be determined from the text, omit it \
(leave the list empty / the optional field null) rather than guessing.
- Normalize values where possible (e.g. use a canonical dataset/optimizer \
name) instead of copying incidental phrasing.
- Extract every dataset, hyperparameter, metric, result, ablation, \
limitation and future-work item you can find - these are lists, not single \
values.
- If the model architecture is described in terms of distinct layers or \
blocks (e.g. "a 12-layer transformer encoder" or "3 convolutional blocks \
followed by a linear head"), list each distinct layer/block under \
`model_architecture.layers`.
"""


def build_extraction_prompt(parsed_paper: ParsedPaper) -> list[tuple[str, str]]:
    """Builds the chat messages for a single structured-extraction call.

    Returns LangChain's (role, content) tuple shorthand so this stays
    provider-agnostic - any `BaseChatModel` accepts this format directly.
    """
    user_content = (
        f"## Paper sections\n\n{_render_sections(parsed_paper)}\n\n"
        f"## Figures, tables and equations\n\n{_render_captions(parsed_paper)}"
    )

    return [
        ("system", SYSTEM_PROMPT),
        ("human", user_content[: settings.LLM_MAX_INPUT_CHARS]),
    ]


def _render_sections(parsed_paper: ParsedPaper) -> str:
    sections_by_name = {section.name: section.text for section in parsed_paper.sections}

    ordered_names = [name for name in _SECTION_ORDER if name in sections_by_name]
    remaining_names = [name for name in sections_by_name if name not in _SECTION_ORDER]

    blocks = [f"### {name.title()}\n{sections_by_name[name]}" for name in ordered_names + remaining_names]
    return "\n\n".join(blocks) if blocks else "(no sections were extracted from this paper)"


def _render_captions(parsed_paper: ParsedPaper) -> str:
    lines: list[str] = []

    for figure in parsed_paper.figures:
        caption = figure.caption or "(no caption detected)"
        lines.append(f"- Figure (page {figure.page_number}): {caption}")

    for table in parsed_paper.tables:
        caption = table.caption or "(no caption detected)"
        lines.append(f"- Table (page {table.page_number}): {caption}")

    if parsed_paper.equations:
        lines.append(f"- {len(parsed_paper.equations)} equation-like lines were detected across the paper.")

    return "\n".join(lines) if lines else "(no figures, tables or equations were detected)"
