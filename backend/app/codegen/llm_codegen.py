from langchain_core.language_models import BaseChatModel

from app.agents.llm_provider import get_chat_model
from app.codegen.prompts import CODEGEN_SYSTEM_PROMPT, build_codegen_user_message
from app.codegen.schemas import GeneratedFile, LLMGeneratedFileSet

_EXPECTED_PATHS = {"model.py", "dataset.py", "losses.py", "metrics.py"}

# Some models/providers happily answer in plain markdown prose instead of
# making the expected tool call when given `with_structured_output` -
# reproduced directly against this codebase's own prompt: with thin context
# (e.g. no retrieval/graph findings yet), the model would rather explain
# itself than call the file-generation tool, so `.invoke()` returns `None`
# (LangChain's structured-output wrapper doesn't raise for "no tool call
# found", it just returns nothing) - which then blew up as an opaque
# "Input should be a valid dictionary ... input_type=NoneType" Pydantic
# error with no indication of what actually went wrong. Appending an
# explicit "use the tool, not prose" instruction reliably fixed this in
# testing; retrying once with it is a safety net in case a given model/
# provider combination still ignores it occasionally.
_TOOL_CALL_REMINDER = (
    "\n\nIMPORTANT: Respond ONLY by calling the file-generation tool with "
    "all four files. Do not respond with plain text or markdown explanation."
)


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
        user_message = build_codegen_user_message(research_notes, retrieval_context, graph_facts_text)
        user_message += _TOOL_CALL_REMINDER

        result: LLMGeneratedFileSet | None = None
        for attempt in range(2):
            messages = [("system", CODEGEN_SYSTEM_PROMPT), ("human", user_message)]
            raw = self._structured_llm.invoke(messages)
            if isinstance(raw, LLMGeneratedFileSet):
                result = raw
                break
            if raw is not None:
                result = LLMGeneratedFileSet.model_validate(raw)
                break
            # `raw is None`: the model responded without calling the tool at
            # all (see _TOOL_CALL_REMINDER's docstring) - retry once with a
            # more insistent nudge rather than fail on the first miss.
            if attempt == 0:
                user_message += "\n\nYou did not call the tool last time - you MUST call it this time."

        if result is None:
            raise ValueError(
                "Code generation failed: the model did not return the expected files "
                "after 2 attempts. This is usually a transient issue with the "
                "configured LLM provider/model - try again, or switch LLM_MODEL."
            )

        files = {file.path: file.content for file in result.files}
        missing = _EXPECTED_PATHS - files.keys()
        if missing:
            raise ValueError(f"LLM code generation did not return required file(s): {sorted(missing)}")

        return [GeneratedFile(path=path, content=files[path]) for path in sorted(_EXPECTED_PATHS)]
