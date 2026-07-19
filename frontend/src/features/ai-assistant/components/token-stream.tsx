import * as React from "react";
import { MarkdownRenderer } from "@/features/ai-assistant/components/markdown-renderer";

interface TokenStreamProps {
  content: string;
}

/** Renders the in-flight assistant text as it grows token-by-token - memoized so a fast token cadence re-renders only this leaf, not the whole conversation. */
export const TokenStream = React.memo(function TokenStream({ content }: TokenStreamProps) {
  return <MarkdownRenderer content={content} />;
});
