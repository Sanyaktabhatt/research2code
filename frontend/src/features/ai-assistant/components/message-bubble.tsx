"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bot, Check, Copy, RotateCcw, ShieldAlert, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { fadeInUp } from "@/lib/motion";
import { MarkdownRenderer } from "@/features/ai-assistant/components/markdown-renderer";
import { CitationChip } from "@/features/ai-assistant/components/citation-chip";
import type { ChatMessage } from "@/features/ai-assistant/types";
import type { Citation } from "@/types/domain";

interface MessageBubbleProps {
  message: ChatMessage;
  onOpenCitation: (citation: Citation, allCitations: Citation[]) => void;
  onRegenerate?: () => void;
  showSystem?: boolean;
}

export function MessageBubble({ message, onOpenCitation, onRegenerate, showSystem }: MessageBubbleProps) {
  const [copied, setCopied] = React.useState(false);
  const citations = message.citations ?? [];
  const handleOpenCitation = (citation: Citation) => onOpenCitation(citation, citations);

  if (message.role === "system" && !showSystem) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  };

  if (message.role === "system") {
    return (
      <div className="flex items-center gap-2 self-center rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">
        <ShieldAlert className="size-3.5" />
        {message.content}
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="show"
      className={cn("group flex gap-2.5", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full shadow-xs",
          isUser ? "border border-border bg-secondary text-secondary-foreground" : "border border-primary/25 bg-primary/10 text-primary",
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>

      <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-1.5", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-[hsl(218_41%_18%)] text-white dark:bg-[hsl(220_18%_22%)]"
              : "rounded-tl-sm border border-border bg-card text-card-foreground shadow-xs",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} citations={message.citations} onOpenCitation={handleOpenCitation} />
          )}
        </div>

        {message.error && <p className="text-xs text-destructive">{message.error}</p>}

        {!isUser && citations.length > 0 && (
          <div className="grid w-full gap-1 sm:grid-cols-2">
            {citations.map((citation) => (
              <CitationChip key={citation.index} citation={citation} onOpen={handleOpenCitation} variant="list" />
            ))}
          </div>
        )}

        {!isUser && (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" onClick={handleCopy} aria-label="Copy response">
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            </Button>
            {onRegenerate && (
              <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" onClick={onRegenerate} aria-label="Regenerate response">
                <RotateCcw className="size-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
