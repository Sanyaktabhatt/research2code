from langchain_core.language_models import BaseChatModel

from app.agents.llm_provider import get_chat_model
from app.agents.orchestrator_prompts import RESEARCH_ANALYST_SYSTEM_PROMPT


class ResearchAnalystAgent:
    """Synthesizes retrieved paper text and knowledge-graph facts into an
    internal analysis note. Its output is consumed by later agents
    (code generator, experiment planner, documentation) - never returned
    to the user directly.
    """

    def __init__(self, chat_model: BaseChatModel | None = None) -> None:
        self.chat_model = chat_model or get_chat_model()

    async def analyze(self, query: str, retrieval_context: str, graph_context: str) -> str:
        user_content = (
            f"## User request\n{query}\n\n"
            f"## Retrieved paper text\n{retrieval_context or '(none)'}\n\n"
            f"## Knowledge graph facts\n{graph_context or '(none)'}"
        )
        messages = [("system", RESEARCH_ANALYST_SYSTEM_PROMPT), ("human", user_content)]
        response = await self.chat_model.ainvoke(messages)
        return response.content
