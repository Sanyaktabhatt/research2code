import type { ChatMessage, Conversation } from "@/features/ai-assistant/types";

/**
 * The backend RAG API has no conversation/message table (see
 * backend/app/schemas/rag.py::RAGQueryRequest.history) - every turn is
 * stateless and the caller resends full history. Conversation persistence
 * is therefore entirely client-side, one localStorage entry per project.
 */
function storageKey(projectId: string): string {
  return `r2c-rag-conversations:${projectId}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readConversations(projectId: string): Conversation[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeConversations(projectId: string, conversations: Conversation[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(conversations));
  } catch {
    // Storage full/unavailable (private browsing) - the session still works, just unpersisted.
  }
}

export function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New conversation";
  const trimmed = firstUser.content.trim().replace(/\s+/g, " ");
  return trimmed.length > 48 ? `${trimmed.slice(0, 45)}...` : trimmed || "New conversation";
}

export function createConversation(projectId: string): Conversation {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    projectId,
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}
