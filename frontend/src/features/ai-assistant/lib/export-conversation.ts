import { citationLabel } from "@/features/ai-assistant/lib/citation-labels";
import type { Conversation } from "@/features/ai-assistant/types";

function download(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "conversation";
}

export function conversationToMarkdown(conversation: Conversation): string {
  const lines: string[] = [`# ${conversation.title}`, ""];
  for (const message of conversation.messages) {
    if (message.role === "system") continue;
    lines.push(`### ${message.role === "user" ? "You" : "Assistant"}`, "", message.content, "");
    if (message.citations && message.citations.length > 0) {
      lines.push(
        "**Sources:**",
        ...message.citations.map(
          (c) => `- [${c.index}] ${citationLabel(c)}${c.page_number !== null ? ` (page ${c.page_number})` : ""}`,
        ),
        "",
      );
    }
  }
  return lines.join("\n");
}

export function exportConversationAsMarkdown(conversation: Conversation): void {
  download(`${slugify(conversation.title)}.md`, conversationToMarkdown(conversation), "text/markdown");
}

export function exportConversationAsJson(conversation: Conversation): void {
  download(`${slugify(conversation.title)}.json`, JSON.stringify(conversation, null, 2), "application/json");
}
