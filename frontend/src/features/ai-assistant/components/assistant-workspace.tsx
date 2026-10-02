"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bug, FileWarning, MessagesSquare, PanelLeftClose, PanelLeftOpen, UploadCloud, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { listPapersForProject } from "@/lib/api/endpoints/papers";
import { queryKeys } from "@/lib/query/keys";
import { WORKSPACE_TABS, workspaceTabHref } from "@/config/nav";
import { useWorkspaceInspectorStore } from "@/stores/workspace-inspector-store";
import { useStreamingStore } from "@/stores/streaming-store";
import { usePaperViewerStore } from "@/features/paper-viewer/stores/use-paper-viewer-store";
import { useConversations } from "@/features/ai-assistant/api/use-conversations";
import { useRagSocket } from "@/features/ai-assistant/api/use-rag-socket";
import { assembleStream } from "@/features/ai-assistant/lib/assemble-stream";
import { citationPreview, entityNameFromSourceRef } from "@/features/ai-assistant/lib/citation-labels";
import { Conversation } from "@/features/ai-assistant/components/conversation";
import { ConversationHistory } from "@/features/ai-assistant/components/conversation-history";
import { PromptComposer } from "@/features/ai-assistant/components/prompt-composer";
import { SuggestedPrompts } from "@/features/ai-assistant/components/suggested-prompts";
import type { ChatMessage } from "@/features/ai-assistant/types";
import type { Citation, ConversationTurn, RAGQueryRequest } from "@/types/domain";

interface AssistantWorkspaceProps {
  projectId: string;
}

/**
 * Feature root for the AI Assistant tab: fetches the project's paper,
 * drives the persistent `/rag/ws` connection, and wires citation clicks
 * into the shared Context Inspector and Paper Viewer navigation store.
 * Conversation history is React-Query-backed (localStorage, no backend
 * conversation resource exists); only the live token buffer is Zustand.
 */
export function AssistantWorkspace({ projectId }: AssistantWorkspaceProps) {
  const router = useRouter();
  const setInspectorSelection = useWorkspaceInspectorStore((s) => s.setSelection);

  const papersQuery = useQuery({
    queryKey: queryKeys.papers.list(projectId),
    queryFn: () => listPapersForProject(projectId),
  });
  const paperId = papersQuery.data?.[0]?.id ?? null;

  const conversations = useConversations(projectId);
  const ragSocket = useRagSocket();

  const [input, setInput] = React.useState("");
  const [historyOpen, setHistoryOpen] = React.useState(true);
  const [showSystem, setShowSystem] = React.useState(false);

  const activeConversationId = conversations.activeConversationId;
  const buffer = useStreamingStore((s) => (activeConversationId ? s.buffers[`rag:${activeConversationId}`] : undefined));
  const assembled = React.useMemo(() => assembleStream(buffer?.frames), [buffer]);
  const committedSignatureRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!activeConversationId || !buffer?.isDone) return;
    const signature = `${activeConversationId}:${buffer.frames.length}`;
    if (committedSignatureRef.current === signature) return;
    committedSignatureRef.current = signature;

    if (assembled.error) return; // Leave the error + Retry affordance in place until the user acts.

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: assembled.text,
      citations: assembled.citations ?? [],
      createdAt: new Date().toISOString(),
    };
    conversations.appendMessage(activeConversationId, assistantMessage);
    useStreamingStore.getState().clear("rag", activeConversationId);
    // conversations/assembled are derived every render; only re-run on the buffer signature actually changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, buffer?.isDone, buffer?.frames.length]);

  const sendQuery = React.useCallback(
    (conversationId: string, query: string, historyMessages: ChatMessage[]) => {
      const history: ConversationTurn[] = historyMessages
        .filter((m): m is ChatMessage & { role: "user" | "assistant" } => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const request: RAGQueryRequest = { query, paper_id: paperId, history };
      ragSocket.ask(conversationId, request);
    },
    [paperId, ragSocket],
  );

  const handleSend = () => {
    const query = input.trim();
    if (!query || ragSocket.isStreaming) return;

    const conversationId = activeConversationId ?? conversations.startNewConversation();
    const priorMessages = conversations.conversations.find((c) => c.id === conversationId)?.messages ?? [];

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: query, createdAt: new Date().toISOString() };
    conversations.appendMessage(conversationId, userMessage);
    setInput("");
    sendQuery(conversationId, query, priorMessages);
  };

  const handleRegenerate = (message: ChatMessage) => {
    if (!activeConversationId) return;
    const messages = conversations.activeConversation?.messages ?? [];
    const index = messages.findIndex((m) => m.id === message.id);
    const priorUser = [...messages.slice(0, index)].reverse().find((m) => m.role === "user");
    if (!priorUser) return;

    conversations.removeMessage(activeConversationId, message.id);
    sendQuery(
      activeConversationId,
      priorUser.content,
      messages.slice(0, messages.findIndex((m) => m.id === priorUser.id)),
    );
  };

  const handleOpenCitation = (citation: Citation, allCitations: Citation[]) => {
    setInspectorSelection({
      tab: "ai-assistant",
      citations: allCitations.map((c) => ({ sourceRef: c.source_ref, content: citationPreview(c) })),
      entities: allCitations.filter((c) => c.source_type === "knowledge_entity").map((c) => entityNameFromSourceRef(c.source_ref)),
    });

    if (citation.page_number === null || !paperId) {
      toast.info("This source has no page reference to jump to.");
      return;
    }
    usePaperViewerStore.getState().setCurrentPage(paperId, citation.page_number);
    usePaperViewerStore.getState().setFocus(
      citation.section_name
        ? { kind: "section", name: citation.section_name, startPage: citation.page_number, endPage: citation.page_number }
        : { kind: "page", pageNumber: citation.page_number },
    );
    const paperTab = WORKSPACE_TABS.find((t) => t.id === "paper")!;
    router.push(workspaceTabHref(projectId, paperTab));
  };

  const handleSelectPrompt = (prompt: string) => setInput(prompt);

  if (papersQuery.isLoading || conversations.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton className="sm:col-span-2" />
      </div>
    );
  }

  if (papersQuery.isError) {
    return <EmptyState icon={FileWarning} title="Couldn't load this project's paper" description="Something went wrong fetching this project's paper." />;
  }

  if (!paperId) {
    return <EmptyState icon={UploadCloud} title="No paper uploaded yet" description="Upload a paper first so the assistant has something to answer questions about." />;
  }

  const activeMessages = conversations.activeConversation?.messages ?? [];
  const hasStartedTurn = Boolean(buffer);

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[520px] gap-4">
      {historyOpen && (
        <aside className="w-64 shrink-0 overflow-hidden rounded-lg border border-border bg-card p-3">
          <ConversationHistory
            conversations={conversations.conversations}
            activeConversationId={activeConversationId}
            activeConversation={conversations.activeConversation}
            onSelect={conversations.selectConversation}
            onNew={conversations.startNewConversation}
            onDelete={conversations.deleteConversation}
            onClearActive={() => activeConversationId && conversations.clearConversation(activeConversationId)}
          />
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setHistoryOpen((v) => !v)} aria-label="Toggle conversation history">
              {historyOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </Button>
            {ragSocket.status !== "open" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <WifiOff className="size-3" />
                {ragSocket.status === "connecting" ? "Connecting…" : "Reconnecting…"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Bug className="size-3.5 text-muted-foreground" />
            <Label htmlFor="show-system" className="text-xs text-muted-foreground">
              Debug
            </Label>
            <Switch id="show-system" checked={showSystem} onCheckedChange={setShowSystem} />
          </div>
        </div>

        {activeMessages.length === 0 && !hasStartedTurn ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <EmptyState
              icon={MessagesSquare}
              title="Ask the assistant"
              description="Ask a question about this paper, or try one of the prompts below."
            />
            <SuggestedPrompts onSelect={handleSelectPrompt} />
          </div>
        ) : (
          <Conversation
            messages={activeMessages}
            showSystem={showSystem}
            streaming={
              hasStartedTurn
                ? { active: true, text: assembled.text, isStreaming: ragSocket.isStreaming, error: assembled.error }
                : null
            }
            onOpenCitation={handleOpenCitation}
            onRegenerate={handleRegenerate}
            onStopStreaming={ragSocket.stop}
            onRetryStreaming={ragSocket.retry}
          />
        )}

        {activeMessages.length > 0 && !ragSocket.isStreaming && <SuggestedPrompts onSelect={handleSelectPrompt} disabled={ragSocket.isStreaming} />}

        <PromptComposer
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={ragSocket.stop}
          isGenerating={ragSocket.isStreaming}
        />
      </div>
    </div>
  );
}
