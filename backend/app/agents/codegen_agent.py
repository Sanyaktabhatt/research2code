from langchain_core.language_models import BaseChatModel

from app.agents.llm_provider import get_chat_model
from app.agents.orchestrator_prompts import CODE_GENERATOR_SYSTEM_PROMPT


class CodeGeneratorAgent:
    """Drafts a focused code skeleton (e.g. model/training loop) grounded in
    the research analyst's notes and knowledge-graph facts. This is a
    reproduction aid, not a full project generator.
    """

    def __init__(self, chat_model: BaseChatModel | None = None) -> None:
        self.chat_model = chat_model or get_chat_model()

    async def generate(self, query: str, research_notes: str, graph_context: str) -> str:
        user_content = (
            f"## User request\n{query}\n\n"
            f"## Research notes\n{research_notes or '(none)'}\n\n"
            f"## Knowledge graph facts\n{graph_context or '(none)'}"
        )
        messages = [("system", CODE_GENERATOR_SYSTEM_PROMPT), ("human", user_content)]
        response = await self.chat_model.ainvoke(messages)
        return response.content
