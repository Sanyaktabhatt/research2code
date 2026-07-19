from langchain_core.language_models import BaseChatModel

from app.agents.llm_provider import get_chat_model
from app.codegen.prompts import CODEGEN_SYSTEM_PROMPT, build_codegen_user_message
from app.codegen.schemas import GeneratedFile, LLMGeneratedFileSet

_EXPECTED_PATHS = {"model.py", "dataset.py", "losses.py", "metrics.py"}


class LLMCodeGenerator:
    """Generates the four paper-specific source files (model/dataset/losses/
    metrics) via structured LLM output. Provider-agnostic - swapping models
    is a `get_chat_model()` settings change, same as every other agent.
    """

    def __init__(self, chat_model: BaseChatModel | None = None) -> None:
        self.chat_model = chat_model or get_chat_model()
        self._structured_llm = self.chat_model.with_structured_output(LLMGeneratedFileSet)

    def generate(
        self,
        research_notes: str,
        retrieval_context: str,
        graph_facts_text: str,
    ) -> list[GeneratedFile]:
        messages = [
            ("system", CODEGEN_SYSTEM_PROMPT),
            ("human", build_codegen_user_message(research_notes, retrieval_context, graph_facts_text)),
        ]

        result = self._structured_llm.invoke(messages)
        if not isinstance(result, LLMGeneratedFileSet):
            result = LLMGeneratedFileSet.model_validate(result)

        files = {file.path: file.content for file in result.files}
        missing = _EXPECTED_PATHS - files.keys()
        if missing:
            raise ValueError(f"LLM code generation did not return required file(s): {sorted(missing)}")

        return [GeneratedFile(path=path, content=files[path]) for path in sorted(_EXPECTED_PATHS)]
