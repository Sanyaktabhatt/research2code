from langchain_core.language_models import BaseChatModel
from pydantic import BaseModel, Field

from app.agents.llm_provider import get_chat_model
from app.agents.orchestrator_prompts import PLANNER_SYSTEM_PROMPT

AVAILABLE_AGENTS = ["retrieval", "graph", "research_analyst", "code_generator", "experiment_planner"]


class PlanDecision(BaseModel):
    plan: list[str] = Field(
        description=f"Ordered subset of {AVAILABLE_AGENTS} needed to answer the request"
    )
    reasoning: str = Field(description="Brief internal justification, never shown to the end user")


class PlannerAgent:
    """Decides which downstream agents actually run for a given request.

    This is the one place "which agents to invoke" is decided; the LangGraph
    workflow (see `app.workflows.graph_builder`) just routes based on the
    resulting plan.
    """

    def __init__(self, chat_model: BaseChatModel | None = None) -> None:
        self.chat_model = chat_model or get_chat_model()
        self._structured_llm = self.chat_model.with_structured_output(PlanDecision)

    async def plan(self, query: str, history_summary: str) -> PlanDecision:
        messages = [
            ("system", PLANNER_SYSTEM_PROMPT),
            (
                "human",
                f"Conversation so far:\n{history_summary or '(none)'}\n\nUser request:\n{query}",
            ),
        ]
        decision = await self._structured_llm.ainvoke(messages)

        if not isinstance(decision, PlanDecision):
            decision = PlanDecision.model_validate(decision)

        # Defensive: drop anything the LLM hallucinated outside the known agent set.
        decision.plan = [agent for agent in decision.plan if agent in AVAILABLE_AGENTS]
        return decision
