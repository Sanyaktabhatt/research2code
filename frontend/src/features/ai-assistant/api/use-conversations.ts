"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  createConversation,
  deriveTitle,
  readConversations,
  writeConversations,
} from "@/features/ai-assistant/lib/conversation-storage";
import type { ChatMessage, Conversation } from "@/features/ai-assistant/types";

function activeIdStorageKey(projectId: string): string {
  return `r2c-rag-active:${projectId}`;
}

function readActiveId(projectId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(activeIdStorageKey(projectId));
}

function writeActiveId(projectId: string, conversationId: string | null): void {
  if (typeof window === "undefined") return;
  if (conversationId) window.localStorage.setItem(activeIdStorageKey(projectId), conversationId);
  else window.localStorage.removeItem(activeIdStorageKey(projectId));
}

/**
 * Conversation history lives entirely client-side (see conversation-storage.ts)
 * but is still modeled through React Query - per the "React Query for
 * persistence, Zustand only for ephemeral streaming state" split - so every
 * feature component reads the same cache instead of drifting out of sync.
 */
export function useConversations(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.rag.conversations(projectId);

  const query = useQuery({
    queryKey,
    queryFn: () => readConversations(projectId),
    staleTime: Infinity,
  });

  const conversations = React.useMemo(
    () => [...(query.data ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [query.data],
  );

  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null);
  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    if (initializedRef.current || !query.isSuccess) return;
    initializedRef.current = true;
    const stored = readActiveId(projectId);
    const restored = stored && conversations.some((c) => c.id === stored) ? stored : (conversations[0]?.id ?? null);
    setActiveConversationId(restored);
  }, [query.isSuccess, conversations, projectId]);

  const persist = React.useCallback(
    (next: Conversation[]) => {
      writeConversations(projectId, next);
      queryClient.setQueryData(queryKey, next);
    },
    [projectId, queryClient, queryKey],
  );

  // Mutations below must read the *live* cache, not the `query.data` this
  // render closed over - `startNewConversation` followed synchronously by
  // `appendMessage` (the very first message of a fresh conversation, e.g.
  // handleSend) is the same tick: `queryClient.setQueryData` from the first
  // call doesn't retroactively update the stale `query.data` a callback
  // already captured, so reading it there would silently clobber the
  // conversation `startNewConversation` just created with the pre-creation
  // list.
  const getCurrent = React.useCallback(
    () => queryClient.getQueryData<Conversation[]>(queryKey) ?? [],
    [queryClient, queryKey],
  );

  const selectConversation = React.useCallback(
    (conversationId: string | null) => {
      setActiveConversationId(conversationId);
      writeActiveId(projectId, conversationId);
    },
    [projectId],
  );

  const startNewConversation = React.useCallback(() => {
    const conversation = createConversation(projectId);
    persist([conversation, ...getCurrent()]);
    selectConversation(conversation.id);
    return conversation.id;
  }, [projectId, persist, getCurrent, selectConversation]);

  const appendMessage = React.useCallback(
    (conversationId: string, message: ChatMessage) => {
      const current = getCurrent();
      const next = current.map((c) => {
        if (c.id !== conversationId) return c;
        const messages = [...c.messages, message];
        return {
          ...c,
          messages,
          updatedAt: message.createdAt,
          title: c.title === "New conversation" ? deriveTitle(messages) : c.title,
        };
      });
      persist(next);
    },
    [getCurrent, persist],
  );

  const updateMessage = React.useCallback(
    (conversationId: string, messageId: string, patch: Partial<ChatMessage>) => {
      const current = getCurrent();
      const next = current.map((c) => {
        if (c.id !== conversationId) return c;
        return { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)) };
      });
      persist(next);
    },
    [getCurrent, persist],
  );

  const removeMessage = React.useCallback(
    (conversationId: string, messageId: string) => {
      const current = getCurrent();
      const next = current.map((c) =>
        c.id === conversationId ? { ...c, messages: c.messages.filter((m) => m.id !== messageId) } : c,
      );
      persist(next);
    },
    [getCurrent, persist],
  );

  const clearConversation = React.useCallback(
    (conversationId: string) => {
      const current = getCurrent();
      const next = current.map((c) =>
        c.id === conversationId ? { ...c, messages: [], title: "New conversation" } : c,
      );
      persist(next);
    },
    [getCurrent, persist],
  );

  const deleteConversation = React.useCallback(
    (conversationId: string) => {
      const current = getCurrent();
      const next = current.filter((c) => c.id !== conversationId);
      persist(next);
      if (activeConversationId === conversationId) {
        selectConversation(next[0]?.id ?? null);
      }
    },
    [getCurrent, persist, activeConversationId, selectConversation],
  );

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;

  return {
    isLoading: query.isLoading,
    conversations,
    activeConversationId,
    activeConversation,
    selectConversation,
    startNewConversation,
    appendMessage,
    updateMessage,
    removeMessage,
    clearConversation,
    deleteConversation,
  };
}
