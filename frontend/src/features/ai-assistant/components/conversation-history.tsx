"use client";

import { Download, FileJson, MessageSquarePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { exportConversationAsJson, exportConversationAsMarkdown } from "@/features/ai-assistant/lib/export-conversation";
import type { Conversation } from "@/features/ai-assistant/types";

interface ConversationHistoryProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClearActive: () => void;
}

export function ConversationHistory({
  conversations,
  activeConversationId,
  activeConversation,
  onSelect,
  onNew,
  onDelete,
  onClearActive,
}: ConversationHistoryProps) {
  return (
    <div className="flex h-full flex-col gap-3">
      <Button size="sm" className="w-full gap-2" onClick={onNew}>
        <MessageSquarePlus className="size-4" />
        New conversation
      </Button>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <EmptyState title="No conversations yet" description="Ask a question to start one." className="p-4" />
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group flex items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                conversation.id === activeConversationId ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              )}
            >
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(conversation.id)}>
                <p className="truncate font-medium">{conversation.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {conversation.messages.length} messages · {formatRelativeTime(conversation.updatedAt)}
                </p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                onClick={() => onDelete(conversation.id)}
                aria-label={`Delete conversation "${conversation.title}"`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      {activeConversation && activeConversation.messages.length > 0 && (
        <div className="space-y-1 border-t border-border pt-3">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={onClearActive}>
            <Trash2 className="size-3.5" />
            Clear conversation
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => exportConversationAsMarkdown(activeConversation)}
          >
            <Download className="size-3.5" />
            Export as Markdown
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => exportConversationAsJson(activeConversation)}
          >
            <FileJson className="size-3.5" />
            Export as JSON
          </Button>
        </div>
      )}
    </div>
  );
}
