from app.schemas.rag import ConversationTurn

SYSTEM_PROMPT = """\
You are a research-paper assistant. Answer the user's question using ONLY \
the numbered context provided below - do not use outside knowledge. Every \
factual claim must be supported by the context; cite the relevant context \
number(s) inline like [1] or [2, 3]. If the context does not contain enough \
information to answer, say so plainly instead of guessing.
"""


def build_rag_messages(
    query: str, context_text: str, history: list[ConversationTurn]
) -> list[tuple[str, str]]:
    """Builds provider-agnostic (role, content) messages for a RAG turn.

    Any `BaseChatModel` from `app.agents.llm_provider.get_chat_model` accepts
    this format directly, so the prompt layer never depends on a vendor SDK.
    """
    messages: list[tuple[str, str]] = [("system", SYSTEM_PROMPT)]

    for turn in history:
        role = "human" if turn.role == "user" else "ai"
        messages.append((role, turn.content))

    user_content = f"## Context\n\n{context_text}\n\n## Question\n\n{query}"
    messages.append(("human", user_content))

    return messages
