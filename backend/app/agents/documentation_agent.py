from collections.abc import AsyncIterator

from langchain_core.language_models import BaseChatModel

from app.agents.llm_provider import get_chat_model
from app.agents.orchestrator_prompts import DOCUMENTATION_SYSTEM_PROMPT


class DocumentationAgent:
    """Composes the single, final, user-facing answer from whichever draft
    sections the plan actually produced. This is the only agent whose
    output is ever returned to the caller - every other agent's output
    (retrieval/graph context, research notes, review notes, etc.) is
    internal reasoning.
    """

    def __init__(self, chat_model: BaseChatModel | None = None) -> None:
        self.chat_model = chat_model or get_chat_model()

    def _build_messages(
        self,
        query: str,
        retrieval_context: str,
        graph_context: str,
        research_notes: str,
        generated_code: str,
        experiment_plan: str,
        review_notes: str,
    ) -> list[tuple[str, str]]:
        sections = {
            "Retrieved paper text": retrieval_context,
            "Knowledge graph facts": graph_context,
            "Research analysis": research_notes,
            "Draft code": generated_code,
            "Experiment plan": experiment_plan,
            "Reviewer notes (address any issues raised here)": review_notes,
        }
        rendered = "\n\n".join(f"### {name}\n{text}" for name, text in sections.items() if text)

        user_content = f"## User request\n{query}\n\n## Available sections\n{rendered or '(none)'}"
        return [("system", DOCUMENTATION_SYSTEM_PROMPT), ("human", user_content)]

    async def generate(
        self,
        query: str,
        retrieval_context: str,
        graph_context: str,
        research_notes: str,
        generated_code: str,
        experiment_plan: str,
        review_notes: str,
    ) -> str:
        messages = self._build_messages(
            query, retrieval_context, graph_context, research_notes, generated_code, experiment_plan, review_notes
        )
        response = await self.chat_model.ainvoke(messages)
        return response.content

    async def stream(
        self,
        query: str,
        retrieval_context: str,
        graph_context: str,
        research_notes: str,
        generated_code: str,
        experiment_plan: str,
        review_notes: str,
    ) -> AsyncIterator[str]:
        messages = self._build_messages(
            query, retrieval_context, graph_context, research_notes, generated_code, experiment_plan, review_notes
        )
        async for chunk in self.chat_model.astream(messages):
            if chunk.content:
                yield chunk.content
