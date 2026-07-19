import fitz

from app.parser.ocr_engine import ocr_page, page_needs_ocr
from app.parser.schemas import PageContent


class PDFTextExtractor:
    """Extracts per-page text via PyMuPDF, falling back to OCR for scanned pages."""

    def extract(self, document: fitz.Document) -> list[PageContent]:
        pages: list[PageContent] = []

        for page_index in range(document.page_count):
            page = document.load_page(page_index)
            text = page.get_text("text")
            used_ocr = False

            if page_needs_ocr(text):
                ocr_text = ocr_page(page)
                if len(ocr_text.strip()) > len(text.strip()):
                    text = ocr_text
                    used_ocr = True

            pages.append(PageContent(page_number=page_index + 1, text=text, used_ocr=used_ocr))

        return pages
