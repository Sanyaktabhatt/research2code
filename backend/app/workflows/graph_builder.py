"""Builds the multi-agent orchestrator's LangGraph state machine.

Every user request is routed through this graph: Planner decides which of
the optional specialist agents (retrieval, graph, research_analyst,
code_generator, experiment_planner) are actually needed, then the shared
`_route_next` conditional edge dynamically visits exactly that subset, in
that order, before finishing at Reviewer. The Documentation agent (the only
agent whose output is user-facing) intentionally runs *outside* this graph,
driven directly by `OrchestratorService` - see the module docstring there
for why.
"""

import operator
import uuid
from typing import Annotated, TypedDict

from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.codegen_agent import CodeGeneratorAgent
from app.agents.experiment_planner_agent import ExperimentPlannerAgent
from app.agents.graph_agent import GraphAgent
from app.agents.planner_agent import AVAILABLE_AGENTS, PlannerAgent
from app.agents.research_analyst_agent import ResearchAnalystAgent
from app.agents.retrieval_agent import RetrievalAgent
from app.agents.reviewer_agent import ReviewerAgent
from app.config.settings import settings
from app.models.user import User
from app.services.codegen_service import CodeGenerationService
from app.services.context_builder import ContextBuilder
from app.services.graph_service import GraphService
from app.services.retrieval_service import RetrievalService

_TERMINAL_NODE = "reviewer"


class OrchestratorState(TypedDict, total=False):
    query: str
    history_summary: str
    paper_id: str | None
    generate_full_project: bool
    plan: list[str]
    remaining_plan: list[str]
    retrieval_context_text: str
    citations: list[dict]
    graph_context: str
    research_notes: str
    generated_code: str
    generated_project_id: str
    generated_project_version: int
    experiment_plan: str
    review_notes: str
    # Internal-only trace of what each agent did; never exposed via the API.
    reasoning_log: Annotated[list[str], operator.add]


def _route_next(state: OrchestratorState) -> str:
    remaining = state.get("remaining_plan") or []
    return remaining[0] if remaining else _TERMINAL_NODE


def build_orchestrator_graph(session: AsyncSession, owner: User) -> CompiledStateGraph:
    """Compiles the orchestrator graph bound to one request's DB session and
    caller. Agents close over `session`/`owner` rather than smuggling
    infrastructure objects through graph state, which stays plain data.
    """
    retrieval_agent = RetrievalAgent(RetrievalService(session), ContextBuilder())
    graph_agent = GraphAgent(GraphService(session))
    research_agent = ResearchAnalystAgent()
    code_agent = CodeGeneratorAgent()
    experiment_agent = ExperimentPlannerAgent()
    reviewer_agent = ReviewerAgent()
    planner_agent = PlannerAgent()
    codegen_service = CodeGenerationService(session)

    async def planner_node(state: OrchestratorState) -> dict:
        decision = await planner_agent.plan(state["query"], state.get("history_summary", ""))
        plan = list(decision.plan)

        # An explicit `generate_full_project` request is a stronger, unambiguous
        # signal than the planner's own heuristic - never let the planner
        # silently drop code_generator when the caller asked for a project.
        if state.get("generate_full_project") and "code_generator" not in plan:
            plan.append("code_generator")

        return {
            "plan": plan,
            "remaining_plan": plan,
            "reasoning_log": [f"planner: {decision.reasoning}"],
        }

    async def retrieval_node(state: OrchestratorState) -> dict:
        paper_id = uuid.UUID(state["paper_id"]) if state.get("paper_id") else None
        context = await retrieval_agent.run(
            query=state["query"],
            owner=owner,
            paper_id=paper_id,
            limit=settings.RAG_DEFAULT_LIMIT,
            token_budget=settings.RAG_CONTEXT_TOKEN_BUDGET,
        )
        return {
            "retrieval_context_text": context.context_text,
            "citations": [c.model_dump(mode="json") for c in context.citations],
            "remaining_plan": state["remaining_plan"][1:],
            "reasoning_log": [f"retrieval: found {len(context.citations)} relevant chunks"],
        }

    async def graph_node(state: OrchestratorState) -> dict:
        paper_id = uuid.UUID(state["paper_id"]) if state.get("paper_id") else None
        facts = await graph_agent.run(paper_id, owner)
        return {
            "graph_context": facts,
            "remaining_plan": state["remaining_plan"][1:],
            "reasoning_log": [
                "graph: retrieved knowledge-graph facts" if facts else "graph: no graph data available"
            ],
        }

    async def research_analyst_node(state: OrchestratorState) -> dict:
        notes = await research_agent.analyze(
            state["query"], state.get("retrieval_context_text", ""), state.get("graph_context", "")
        )
        return {
            "research_notes": notes,
            "remaining_plan": state["remaining_plan"][1:],
            "reasoning_log": ["research_analyst: synthesized findings"],
        }

    async def code_generator_node(state: OrchestratorState) -> dict:
        base_update = {"remaining_plan": state["remaining_plan"][1:]}

        if state.get("generate_full_project") and state.get("paper_id"):
            paper_id = uuid.UUID(state["paper_id"])
            try:
                project = await codegen_service.trigger_generation(
                    paper_id,
                    owner,
                    research_notes=state.get("research_notes", ""),
                    graph_facts_text=state.get("graph_context", ""),
                    retrieval_context=state.get("retrieval_context_text", ""),
                )
            except Exception as exc:  # noqa: BLE001 - reported in the answer, not raised to the caller
                return {
                    **base_update,
                    "generated_code": f"Could not start project generation: {exc}",
                    "reasoning_log": [f"code_generator: failed to queue project generation: {exc}"],
                }

            return {
                **base_update,
                "generated_code": (
                    f"Full project generation has been queued (version {project.version}). "
                    f"Track progress via GET /papers/{paper_id}/generated-projects/{project.version} "
                    "or the codegen progress WebSocket."
                ),
                "generated_project_id": str(project.id),
                "generated_project_version": project.version,
                "reasoning_log": [f"code_generator: queued full project generation (version {project.version})"],
            }

        code = await code_agent.generate(
            state["query"], state.get("research_notes", ""), state.get("graph_context", "")
        )
        return {
            **base_update,
            "generated_code": code,
            "reasoning_log": ["code_generator: drafted code"],
        }

    async def experiment_planner_node(state: OrchestratorState) -> dict:
        plan_text = await experiment_agent.plan(
            state["query"], state.get("research_notes", ""), state.get("graph_context", "")
        )
        return {
            "experiment_plan": plan_text,
            "remaining_plan": state["remaining_plan"][1:],
            "reasoning_log": ["experiment_planner: drafted experiment plan"],
        }

    async def reviewer_node(state: OrchestratorState) -> dict:
        notes = await reviewer_agent.review(
            state["query"],
            state.get("research_notes", ""),
            state.get("generated_code", ""),
            state.get("experiment_plan", ""),
        )
        return {"review_notes": notes, "reasoning_log": ["reviewer: reviewed draft output"]}

    graph = StateGraph(OrchestratorState)
    graph.add_node("planner", planner_node)
    graph.add_node("retrieval", retrieval_node)
    graph.add_node("graph", graph_node)
    graph.add_node("research_analyst", research_analyst_node)
    graph.add_node("code_generator", code_generator_node)
    graph.add_node("experiment_planner", experiment_planner_node)
    graph.add_node(_TERMINAL_NODE, reviewer_node)

    graph.set_entry_point("planner")

    path_map = [*AVAILABLE_AGENTS, _TERMINAL_NODE]
    for node_name in ["planner", *AVAILABLE_AGENTS]:
        graph.add_conditional_edges(node_name, _route_next, path_map)

    graph.add_edge(_TERMINAL_NODE, END)

    return graph.compile()
