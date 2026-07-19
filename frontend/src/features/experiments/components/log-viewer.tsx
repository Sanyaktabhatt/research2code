"use client";

import * as React from "react";
import { Check, Copy, Download, Pause, Play, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import { cn } from "@/lib/utils/cn";
import { parseAnsiLine } from "@/features/experiments/lib/parse-ansi-line";
import { downloadFromUrl, downloadTextFile } from "@/features/generated-project/lib/download-file";

interface LogViewerProps {
  lines: string[];
  isLive: boolean;
  downloadUrl?: string | null;
}

function LogLine({ line, needle }: { line: string; needle: string }) {
  const segments = React.useMemo(() => parseAnsiLine(line), [line]);
  const isMatch = needle.length > 0 && line.toLowerCase().includes(needle);

  return (
    <pre className={cn("whitespace-pre-wrap break-all px-3 py-0.5 font-mono text-xs leading-5", isMatch && "bg-warning/15")}>
      {segments.length === 0
        ? " "
        : segments.map((segment, index) => (
            <span
              key={index}
              style={{
                color: segment.fg ?? undefined,
                backgroundColor: segment.bg ?? undefined,
                fontWeight: segment.bold ? 700 : undefined,
                fontStyle: segment.italic ? "italic" : undefined,
                textDecoration: segment.underline ? "underline" : undefined,
              }}
            >
              {segment.text}
            </span>
          ))}
    </pre>
  );
}

/** Live-streaming log viewer: virtualized (handles thousands of lines), ANSI-colored, searchable, auto-scrolling with a pause toggle, copyable, downloadable. */
export function LogViewer({ lines, isLive, downloadUrl }: LogViewerProps) {
  const [search, setSearch] = React.useState("");
  const [paused, setPaused] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const needle = search.trim().toLowerCase();
  const displayedLines = React.useMemo(() => (needle ? lines.filter((l) => l.toLowerCase().includes(needle)) : lines), [lines, needle]);

  React.useEffect(() => {
    if (paused) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [displayedLines.length, paused]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayedLines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      downloadFromUrl("execution-run.log", downloadUrl);
    } else {
      downloadTextFile("execution-run.log", lines.join("\n"));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs…" className="pl-8 pr-8" />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 size-7 -translate-y-1/2"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        {needle && (
          <Badge variant="secondary">
            {displayedLines.length} match{displayedLines.length === 1 ? "" : "es"}
          </Badge>
        )}
        {isLive && (
          <Button variant={paused ? "secondary" : "outline"} size="sm" className="gap-1.5" onClick={() => setPaused((v) => !v)}>
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            {paused ? "Resume scroll" : "Pause scroll"}
          </Button>
        )}
        <Button variant="outline" size="icon" className="size-8" onClick={handleCopy} aria-label="Copy logs">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
        <Button variant="outline" size="icon" className="size-8" onClick={handleDownload} disabled={lines.length === 0} aria-label="Download logs">
          <Download className="size-3.5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-[#0b0b0b]">
        {displayedLines.length === 0 ? (
          <EmptyState
            title={lines.length === 0 ? "No logs yet" : "No lines match"}
            description={lines.length === 0 ? "Logs will appear here once the run starts." : "Try a different search term."}
            className="h-full border-0 bg-transparent text-white/70"
          />
        ) : (
          <VirtualizedList
            ref={scrollRef}
            items={displayedLines}
            estimateSize={20}
            className="h-full overflow-y-auto text-white"
            getKey={(_, index) => index}
            renderItem={(line) => <LogLine line={line} needle={needle} />}
          />
        )}
      </div>
    </div>
  );
}
