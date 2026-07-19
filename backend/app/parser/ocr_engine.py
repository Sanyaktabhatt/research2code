import fitz
import pytesseract
from PIL import Image

from app.config.settings import settings

if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


def page_needs_ocr(extracted_text: str) -> bool:
    """A page with little to no extractable text is assumed to be a scanned image."""
    return len(extracted_text.strip()) < settings.OCR_MIN_TEXT_LENGTH


def ocr_page(page: fitz.Page) -> str:
    """Renders a PDF page to an image and runs Tesseract OCR over it."""
    zoom = settings.OCR_RENDER_DPI / 72
    matrix = fitz.Matrix(zoom, zoom)
    pixmap = page.get_pixmap(matrix=matrix, colorspace=fitz.csRGB)

    image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
    return pytesseract.image_to_string(image, lang=settings.OCR_LANGUAGE)
