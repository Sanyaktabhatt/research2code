import logging
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.documentation_agent import DocumentationAgent
from app.models.user import User
from app.schemas.orchestrator import GeneratedProjectRef, OrchestratorAnswer, OrchestratorQueryRequest
from app.schemas.rag import Citation, ConversationTurn
from app.workflows.graph_builder import OrchestratorState, build_orchestrator_graph

logger = logging.getLogger(__name__)


class OrchestratorService:
    """Every user request goes through here: runs the multi-agent LangGraph
    pipeline (Planner through Reviewer), then has the Documentation agent
    compose the single user-facing answer from whatever the plan produced.

    Documentation intentionally runs outside the compiled graph rather than
    as its final node: `stream()` needs to forward the Documentation LLM
    call's token deltas directly to the caller, which is far simpler and
    more robust to drive explicitly here than through LangGraph's own
    streaming API for one specific node's output.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.documentation_agent = DocumentationAgent()

    async def run(self, request: OrchestratorQueryRequest, owner: User) -> OrchestratorAnswer:
        final_state = await self._run_graph(request, owner)

        answer = await self.documentation_agent.generate(
            request.query,
            final_state.get("retrieval_context_text", ""),
            final_state.get("graph_context", ""),
            final_state.get("research_notes", ""),
            final_state.get("generated_code", ""),
            final_state.get("experiment_plan", ""),
            final_state.get("review_notes", ""),
        )

        self._log_reasoning(final_state)
        return OrchestratorAnswer(
            answer=answer,
            citations=self._citations(final_state),
            generated_project=self._generated_project(final_state),
        )

    async def stream(
        self, request: OrchestratorQueryRequest, owner: User
    ) -> tuple[AsyncIterator[str], list[Citation], GeneratedProjectRef | None]:
        """Returns a text-delta stream plus the citations/generated-project
        pointer, which are already known once the graph portion of the
        pipeline finishes.
        """
        final_state = await self._run_graph(request, owner)
        self._log_reasoning(final_state)

        stream = self.documentation_agent.stream(
            request.query,
            final_state.get("retrieval_context_text", ""),
            final_state.get("graph_context", ""),
            final_state.get("research_notes", ""),
            final_state.get("generated_code", ""),
            final_state.get("experiment_plan", ""),
            final_state.get("review_notes", ""),
        )
        return stream, self._citations(final_state), self._generated_project(final_state)

    async def _run_graph(self, request: OrchestratorQueryRequest, owner: User) -> OrchestratorState:
        compiled_graph = build_orchestrator_graph(self.session, owner)

        initial_state: OrchestratorState = {
            "query": request.query,
            "history_summary": self._summarize_history(request.history),
            "paper_id": str(request.paper_id) if request.paper_id else None,
            "generate_full_project": request.generate_full_project,
        }

        final_state: OrchestratorState = initial_state
        async for state in compiled_graph.astream(initial_state, stream_mode="values"):
            final_state = state

        return final_state

    @staticmethod
    def _summarize_history(history: list[ConversationTurn]) -> str:
        if not history:
            return ""
        return "\n".join(f"{turn.role}: {turn.content}" for turn in history)

    @staticmethod
    def _citations(state: OrchestratorState) -> list[Citation]:
        return [Citation.model_validate(item) for item in state.get("citations", [])]

    @staticmethod
    def _generated_project(state: OrchestratorState) -> GeneratedProjectRef | None:
        project_id = state.get("generated_project_id")
        version = state.get("generated_project_version")
        if project_id is None or version is None:
            return None
        return GeneratedProjectRef(id=project_id, version=version)

    def _log_reasoning(self, state: OrchestratorState) -> None:
        # Internal-only trace of what each agent did - never returned via the API.
        for line in state.get("reasoning_log", []):
            logger.info("orchestrator reasoning: %s", line)
