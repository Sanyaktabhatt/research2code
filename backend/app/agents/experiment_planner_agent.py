from langchain_core.language_models import BaseChatModel

from app.agents.llm_provider import get_chat_model
from app.agents.orchestrator_prompts import EXPERIMENT_PLANNER_SYSTEM_PROMPT


class ExperimentPlannerAgent:
    """Proposes concrete experiments, ablations, or hyperparameter sweeps
    grounded in the research analyst's notes and knowledge-graph facts.
    """

    def __init__(self, chat_model: BaseChatModel | None = None) -> None:
        self.chat_model = chat_model or get_chat_model()

    async def plan(self, query: str, research_notes: str, graph_context: str) -> str:
        user_content = (
            f"## User request\n{query}\n\n"
            f"## Research notes\n{research_notes or '(none)'}\n\n"
            f"## Knowledge graph facts\n{graph_context or '(none)'}"
        )
        messages = [("system", EXPERIMENT_PLANNER_SYSTEM_PROMPT), ("human", user_content)]
        response = await self.chat_model.ainvoke(messages)
        return response.content
