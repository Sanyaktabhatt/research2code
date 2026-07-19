import fitz

from app.parser.figure_extractor import FigureTableEquationExtractor
from app.parser.pdf_parser import PDFTextExtractor
from app.parser.schemas import ParsedPaper
from app.parser.section_extractor import SectionExtractor


class PaperParsingPipeline:
    """Coordinates text extraction, OCR fallback, section splitting and
    figure/table/equation extraction into a single structured result.

    Each stage is a standalone, independently replaceable component:
    - `PDFTextExtractor` for text + OCR fallback
    - `SectionExtractor` for logical section splitting
    - `FigureTableEquationExtractor` for figures/tables/equations
    """

    def __init__(
        self,
        text_extractor: PDFTextExtractor | None = None,
        section_extractor: SectionExtractor | None = None,
        figure_extractor: FigureTableEquationExtractor | None = None,
    ) -> None:
        self.text_extractor = text_extractor or PDFTextExtractor()
        self.section_extractor = section_extractor or SectionExtractor()
        self.figure_extractor = figure_extractor or FigureTableEquationExtractor()

    def run(self, pdf_bytes: bytes) -> ParsedPaper:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as document:
            pages = self.text_extractor.extract(document)
            sections = self.section_extractor.extract(pages)
            figures, tables, equations = self.figure_extractor.extract(document, pages)

        return ParsedPaper(
            pages=pages,
            sections=sections,
            figures=figures,
            tables=tables,
            equations=equations,
            page_count=len(pages),
            ocr_page_count=sum(1 for page in pages if page.used_ocr),
        )
