import re

from app.parser.schemas import PageContent, Section

# Ordered so that a later, more specific pattern is not shadowed by an earlier
# generic one. Matching is heading-line based (short lines only) rather than
# full-text search, to avoid false positives from in-body references such as
# "as discussed in the introduction".
_HEADING_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("abstract", re.compile(r"^\s*abstract\b", re.IGNORECASE)),
    ("introduction", re.compile(r"^\s*(\d+[.)]?\s*)?introduction\b", re.IGNORECASE)),
    (
        "methodology",
        re.compile(r"^\s*(\d+[.)]?\s*)?(methodology|methods?|approach|proposed method)\b", re.IGNORECASE),
    ),
    (
        "experiments",
        re.compile(r"^\s*(\d+[.)]?\s*)?(experiments?|experimental setup|evaluation)\b", re.IGNORECASE),
    ),
    ("results", re.compile(r"^\s*(\d+[.)]?\s*)?(results|discussion)\b", re.IGNORECASE)),
    ("references", re.compile(r"^\s*(references|bibliography)\b", re.IGNORECASE)),
]

_MAX_HEADING_LINE_LENGTH = 60


def _match_heading(line: str) -> str | None:
    stripped = line.strip()
    if not stripped or len(stripped) > _MAX_HEADING_LINE_LENGTH:
        return None
    for name, pattern in _HEADING_PATTERNS:
        if pattern.match(stripped):
            return name
    return None


class SectionExtractor:
    """Splits page text into logical sections using heading-line heuristics.

    Text preceding the first recognized heading is treated as the "title"
    section (title, authors, affiliations). Swap `_HEADING_PATTERNS` or the
    matching strategy (e.g. font-size based via PyMuPDF spans) independently
    of the rest of the pipeline.
    """

    def extract(self, pages: list[PageContent]) -> list[Section]:
        if not pages:
            return []

        sections: list[Section] = []
        current_name = "title"
        current_lines: list[str] = []
        current_start_page: int | None = pages[0].page_number
        seen_names: set[str] = set()

        def close_section(end_page: int | None) -> None:
            text = "\n".join(current_lines).strip()
            if text:
                sections.append(
                    Section(
                        name=current_name,
                        text=text,
                        start_page=current_start_page,
                        end_page=end_page,
                    )
                )

        for page in pages:
            for line in page.text.splitlines():
                heading = _match_heading(line)
                if heading is not None and heading not in seen_names:
                    close_section(page.page_number)
                    seen_names.add(heading)
                    current_name = heading
                    current_lines = []
                    current_start_page = page.page_number
                    continue
                current_lines.append(line)

        close_section(pages[-1].page_number)
        return sections
