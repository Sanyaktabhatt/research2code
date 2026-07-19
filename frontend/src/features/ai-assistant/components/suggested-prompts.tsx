import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUGGESTED_PROMPTS } from "@/features/ai-assistant/lib/suggested-prompts";

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestedPrompts({ onSelect, disabled }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTED_PROMPTS.map((prompt) => (
        <Button
          key={prompt}
          variant="outline"
          size="sm"
          className="h-auto gap-1.5 whitespace-normal rounded-full px-3 py-1.5 text-left text-xs"
          onClick={() => onSelect(prompt)}
          disabled={disabled}
        >
          <Sparkles className="size-3 shrink-0 text-muted-foreground" />
          {prompt}
        </Button>
      ))}
    </div>
  );
}
