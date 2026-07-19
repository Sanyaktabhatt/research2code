from langchain_core.language_models import BaseChatModel

from app.agents.llm_provider import get_chat_model
from app.agents.orchestrator_prompts import REVIEWER_SYSTEM_PROMPT


class ReviewerAgent:
    """Checks the pipeline's own draft output for consistency before the
    Documentation agent composes the final answer. Its notes are internal
    only and are never returned to the user.
    """

    def __init__(self, chat_model: BaseChatModel | None = None) -> None:
        self.chat_model = chat_model or get_chat_model()

    async def review(
        self,
        query: str,
        research_notes: str,
        generated_code: str,
        experiment_plan: str,
    ) -> str:
        sections = {
            "Research notes": research_notes,
            "Generated code": generated_code,
            "Experiment plan": experiment_plan,
        }
        rendered = "\n\n".join(f"### {name}\n{text}" for name, text in sections.items() if text)

        if not rendered:
            return "No draft sections were produced for this request; nothing to review."

        user_content = f"## User request\n{query}\n\n## Draft sections\n{rendered}"
        messages = [("system", REVIEWER_SYSTEM_PROMPT), ("human", user_content)]
        response = await self.chat_model.ainvoke(messages)
        return response.content
