import { Bot, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypingIndicator } from "@/features/ai-assistant/components/typing-indicator";
import { TokenStream } from "@/features/ai-assistant/components/token-stream";

interface StreamingMessageProps {
  text: string;
  isStreaming: boolean;
  error: string | null;
  onStop: () => void;
  onRetry: () => void;
}

/** The in-flight assistant turn: typing indicator until the first token, then the growing token stream, a Stop button while generating, and Retry on error. */
export function StreamingMessage({ text, isStreaming, error, onStop, onRetry }: StreamingMessageProps) {
  return (
    <div className="flex gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
        <Bot className="size-3.5" />
      </div>
      <div className="flex min-w-0 max-w-[85%] flex-col gap-1.5">
        <div className="rounded-lg rounded-tl-sm border border-border bg-card px-4 py-2.5 text-sm leading-relaxed text-card-foreground shadow-xs">
          {text.length === 0 && !error ? <TypingIndicator /> : <TokenStream content={text} />}
        </div>

        {error && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-xs" onClick={onRetry}>
              <RotateCcw className="size-3" />
              Retry
            </Button>
          </div>
        )}

        {isStreaming && (
          <Button variant="outline" size="sm" className="h-6 w-fit gap-1 px-2 text-xs" onClick={onStop}>
            <Square className="size-3" />
            Stop generating
          </Button>
        )}
      </div>
    </div>
  );
}
