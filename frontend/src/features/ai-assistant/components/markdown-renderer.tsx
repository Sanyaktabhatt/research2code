"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Check, Copy } from "lucide-react";
import { PrismAsync as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils/cn";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CitationChip } from "@/features/ai-assistant/components/citation-chip";
import { remarkCitations } from "@/features/ai-assistant/lib/remark-citations";
import type { Citation } from "@/types/domain";

function CodeBlockCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard permission denied - silently no-op, the code is still selectable.
        }
      }}
      className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Copy code"
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const REMARK_PLUGINS = [remarkGfm, remarkMath, remarkCitations];
const REHYPE_PLUGINS = [rehypeKatex];

interface MarkdownRendererProps {
  content: string;
  citations?: Citation[];
  onOpenCitation?: (citation: Citation) => void;
  className?: string;
}

/** Shared markdown renderer: GFM (tables/strikethrough), LaTeX (KaTeX), syntax-highlighted code, and clickable `[N]` citation markers. Used by both MessageBubble and StreamingMessage so rendering never diverges between a finished and an in-flight turn. */
export function MarkdownRenderer({ content, citations = [], onOpenCitation, className }: MarkdownRendererProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const codeStyle = mounted && resolvedTheme === "dark" ? oneDark : oneLight;

  const citationsById = React.useMemo(() => new Map(citations.map((c) => [c.index, c])), [citations]);

  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:p-0", className)}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={{
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName ?? "");
            const isBlock = Boolean(match);
            if (!isBlock) {
              return (
                <code className={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]", codeClassName)} {...props}>
                  {children}
                </code>
              );
            }
            const code = String(children).replace(/\n$/, "");
            return (
              <div className="not-prose overflow-hidden rounded-lg border border-border shadow-xs">
                <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {match![1]}
                  </span>
                  <CodeBlockCopyButton code={code} />
                </div>
                <SyntaxHighlighter
                  language={match![1]}
                  style={codeStyle}
                  customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.8125rem", padding: "0.875rem 1rem" }}
                  PreTag="div"
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          },
          table({ children }) {
            return (
              <div className="not-prose overflow-hidden overflow-x-auto rounded-lg border border-border shadow-xs">
                <Table>{children}</Table>
              </div>
            );
          },
          thead({ children }) {
            return <TableHeader>{children}</TableHeader>;
          },
          tbody({ children }) {
            return <TableBody>{children}</TableBody>;
          },
          tr({ children }) {
            return <TableRow>{children}</TableRow>;
          },
          th({ children }) {
            return <TableHead>{children}</TableHead>;
          },
          td({ children }) {
            return <TableCell>{children}</TableCell>;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                {children}
              </a>
            );
          },
          // @ts-expect-error - custom element injected by remarkCitations via data.hName, not a real HTML tag
          "citation-ref": ({ "data-indices": dataIndices }: { "data-indices": string }) => {
            const indices = dataIndices.split(",").map(Number);
            return (
              <React.Fragment>
                {indices.map((index) => {
                  const citation = citationsById.get(index);
                  if (!citation) return <sup key={index}>[{index}]</sup>;
                  return <CitationChip key={index} citation={citation} onOpen={(c) => onOpenCitation?.(c)} />;
                })}
              </React.Fragment>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
