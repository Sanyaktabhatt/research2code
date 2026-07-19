import re

import fitz

from app.parser.schemas import BoundingBox, EquationRef, FigureRef, PageContent, TableRef

_FIGURE_CAPTION_PATTERN = re.compile(r"^\s*fig(?:ure)?\.?\s*\d+[:.]?", re.IGNORECASE)
_TABLE_CAPTION_PATTERN = re.compile(r"^\s*table\s*\d+[:.]?", re.IGNORECASE)

# Heuristic: lines dense with mathematical symbols are treated as standalone
# equations, as opposed to prose that merely mentions a symbol in passing.
_EQUATION_SYMBOLS = set("=+−–±×÷∑∏∫√∞≤≥≈∂∇αβγδθλμπσφω")
_EQUATION_MIN_SYMBOLS = 2
_MAX_EQUATION_LINE_LENGTH = 200
_TABLE_EXCERPT_LINES = 15


def _find_caption(lines: list[str], pattern: re.Pattern) -> str | None:
    for line in lines:
        if pattern.match(line.strip()):
            return line.strip()
    return None


def _is_equation_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped or len(stripped) > _MAX_EQUATION_LINE_LENGTH:
        return False
    symbol_count = sum(1 for ch in stripped if ch in _EQUATION_SYMBOLS)
    return symbol_count >= _EQUATION_MIN_SYMBOLS


class FigureTableEquationExtractor:
    """Heuristic extraction of figures, tables, captions and equations.

    Figures are grounded in PyMuPDF's embedded-image metadata (page + bbox);
    tables and equations rely on textual heuristics since no layout-detection
    model is wired in yet. Each extractor method is independent so a real
    layout model (e.g. for tables) can replace its heuristic later without
    touching the others.
    """

    def extract(
        self, document: fitz.Document, pages: list[PageContent]
    ) -> tuple[list[FigureRef], list[TableRef], list[EquationRef]]:
        figures: list[FigureRef] = []
        tables: list[TableRef] = []
        equations: list[EquationRef] = []

        for page_content in pages:
            page = document.load_page(page_content.page_number - 1)
            lines = page_content.text.splitlines()

            figures.extend(self._extract_figures(page, page_content.page_number, lines))
            tables.extend(self._extract_tables(page_content.page_number, lines))
            equations.extend(self._extract_equations(page_content.page_number, lines))

        return figures, tables, equations

    def _extract_figures(
        self, page: fitz.Page, page_number: int, lines: list[str]
    ) -> list[FigureRef]:
        caption = _find_caption(lines, _FIGURE_CAPTION_PATTERN)
        results: list[FigureRef] = []

        for index, image in enumerate(page.get_images(full=True)):
            xref = image[0]
            rects = page.get_image_rects(xref)
            bbox = None
            if rects:
                rect = rects[0]
                bbox = BoundingBox(x0=rect.x0, y0=rect.y0, x1=rect.x1, y1=rect.y1)

            results.append(FigureRef(page_number=page_number, index=index, caption=caption, bbox=bbox))

        return results

    def _extract_tables(self, page_number: int, lines: list[str]) -> list[TableRef]:
        results: list[TableRef] = []
        index = 0

        for line_index, line in enumerate(lines):
            if _TABLE_CAPTION_PATTERN.match(line.strip()):
                raw_text = "\n".join(lines[line_index : line_index + _TABLE_EXCERPT_LINES]).strip()
                results.append(
                    TableRef(page_number=page_number, index=index, caption=line.strip(), raw_text=raw_text)
                )
                index += 1

        return results

    def _extract_equations(self, page_number: int, lines: list[str]) -> list[EquationRef]:
        results: list[EquationRef] = []
        index = 0

        for line in lines:
            if _is_equation_line(line):
                results.append(EquationRef(page_number=page_number, index=index, text=line.strip()))
                index += 1

        return results
