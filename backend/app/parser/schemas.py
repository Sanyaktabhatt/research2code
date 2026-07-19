from pydantic import BaseModel, Field

SECTION_NAMES = (
    "title",
    "abstract",
    "introduction",
    "methodology",
    "experiments",
    "results",
    "references",
)


class BoundingBox(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float


class PageContent(BaseModel):
    page_number: int
    text: str
    used_ocr: bool = False


class Section(BaseModel):
    name: str
    text: str
    start_page: int | None = None
    end_page: int | None = None


class FigureRef(BaseModel):
    page_number: int
    index: int
    caption: str | None = None
    bbox: BoundingBox | None = None


class TableRef(BaseModel):
    page_number: int
    index: int
    caption: str | None = None
    raw_text: str | None = None


class EquationRef(BaseModel):
    page_number: int
    index: int
    text: str


class ParsedPaper(BaseModel):
    pages: list[PageContent] = Field(default_factory=list)
    sections: list[Section] = Field(default_factory=list)
    figures: list[FigureRef] = Field(default_factory=list)
    tables: list[TableRef] = Field(default_factory=list)
    equations: list[EquationRef] = Field(default_factory=list)
    page_count: int = 0
    ocr_page_count: int = 0
