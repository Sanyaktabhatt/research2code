from langchain_core.language_models import BaseChatModel
from langchain_core.runnables import Runnable

from app.agents.llm_provider import get_chat_model
from app.agents.prompts import build_extraction_prompt
from app.agents.schemas import ExtractedKnowledge
from app.parser.schemas import ParsedPaper


class KnowledgeExtractionAgent:
    """Extracts structured, confidence-scored knowledge from a `ParsedPaper`.

    The chat model is injected so a different LLM (or a fake, in tests) can
    be swapped in without touching the extraction logic itself.
    """

    def __init__(self, chat_model: BaseChatModel | None = None) -> None:
        self.chat_model = chat_model or get_chat_model()
        self._structured_llm: Runnable = self.chat_model.with_structured_output(ExtractedKnowledge)

    def extract(self, parsed_paper: ParsedPaper) -> ExtractedKnowledge:
        messages = build_extraction_prompt(parsed_paper)
        result = self._structured_llm.invoke(messages)

        if not isinstance(result, ExtractedKnowledge):
            # Some providers return a dict when function-calling schemas are used;
            # normalize defensively so callers can always rely on the Pydantic type.
            return ExtractedKnowledge.model_validate(result)

        return result
