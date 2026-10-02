"use client";

import * as React from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

/** Multiline composer: Enter (or Ctrl/Cmd+Enter) sends, Shift+Enter inserts a newline, disabled while a turn is in flight, and accepts a dropped paper reference as a `@name` mention (future-ready - nothing resolves it server-side yet). */
export function PromptComposer({ value, onChange, onSend, onStop, isGenerating, disabled }: PromptComposerProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!isGenerating && value.trim().length > 0) onSend();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (isGenerating) return;
    const fileName = event.dataTransfer.files[0]?.name;
    const text = fileName ?? event.dataTransfer.getData("text/plain");
    if (!text) return;
    onChange(value ? `${value.trimEnd()} @${text} ` : `@${text} `);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "relative rounded-lg border border-input bg-card shadow-xs transition-[border-color,box-shadow] duration-150",
          isFocused && "border-ring ring-[3px] ring-ring/20",
          isDragOver && "border-primary ring-[3px] ring-primary/15",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ask about this paper… (Enter to send, Shift+Enter for a new line)"
          disabled={disabled}
          rows={1}
          className="max-h-[200px] resize-none border-0 bg-transparent pr-12 shadow-none focus-visible:ring-0"
        />
        <div className="absolute bottom-1.5 right-1.5">
          {isGenerating ? (
            <Button type="button" size="icon" variant="secondary" className="size-8 rounded-lg" onClick={onStop} aria-label="Stop generating">
              <Square className="size-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              className="size-8 rounded-lg"
              onClick={onSend}
              disabled={disabled || value.trim().length === 0}
              aria-label="Send message"
            >
              <Send className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
