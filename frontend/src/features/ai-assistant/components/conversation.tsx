"use client";

import * as React from "react";
import { MessageBubble } from "@/features/ai-assistant/components/message-bubble";
import { StreamingMessage } from "@/features/ai-assistant/components/streaming-message";
import type { ChatMessage } from "@/features/ai-assistant/types";
import type { Citation } from "@/types/domain";

interface ConversationProps {
  messages: ChatMessage[];
  showSystem: boolean;
  streaming: { active: boolean; text: string; isStreaming: boolean; error: string | null } | null;
  onOpenCitation: (citation: Citation, allCitations: Citation[]) => void;
  onRegenerate: (message: ChatMessage) => void;
  onStopStreaming: () => void;
  onRetryStreaming: () => void;
}

export function Conversation({
  messages,
  showSystem,
  streaming,
  onOpenCitation,
  onRegenerate,
  onStopStreaming,
  onRetryStreaming,
}: ConversationProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streaming?.text, streaming?.active]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-1 py-2">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onOpenCitation={onOpenCitation}
          onRegenerate={
            message.role === "assistant" && message.id === lastAssistantId && !streaming?.active
              ? () => onRegenerate(message)
              : undefined
          }
          showSystem={showSystem}
        />
      ))}

      {streaming?.active && (
        <StreamingMessage
          text={streaming.text}
          isStreaming={streaming.isStreaming}
          error={streaming.error}
          onStop={onStopStreaming}
          onRetry={onRetryStreaming}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
