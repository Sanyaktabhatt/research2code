"use client";

import * as React from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Copy, Download, FileCode, Map as MapIcon, WrapText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { cn } from "@/lib/utils/cn";
import { languageInfoForPath, monacoLanguageForPath } from "@/features/generated-project/lib/file-language";
import { downloadTextFile } from "@/features/generated-project/lib/download-file";

interface CodeEditorProps {
  openPaths: string[];
  activePath: string | null;
  files: Map<string, string>;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

/** Read-only Monaco viewer for the generated project's files - tabs, minimap toggle, word wrap toggle, copy, and single-file download. Reused as-is by GeneratedProjectExplorer; DiffViewer is the separate two-version comparison surface. */
export function CodeEditor({ openPaths, activePath, files, onSelectTab, onCloseTab }: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [minimapEnabled, setMinimapEnabled] = React.useState(false);
  const [wordWrap, setWordWrap] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const activeContent = activePath ? (files.get(activePath) ?? "") : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  };

  const handleDownload = () => {
    if (!activePath) return;
    downloadTextFile(activePath.split("/").pop() ?? activePath, activeContent);
  };

  if (openPaths.length === 0 || !activePath) {
    return <EmptyState icon={FileCode} title="No file open" description="Select a file from the tree to view it." className="h-full" />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center border-b border-border bg-muted/30">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {openPaths.map((path) => {
            const Icon = languageInfoForPath(path).icon;
            const isActive = path === activePath;
            return (
              <button
                key={path}
                type="button"
                onClick={() => onSelectTab(path)}
                className={cn(
                  "group relative flex shrink-0 items-center gap-1.5 border-r border-border/60 px-3 py-1.5 text-xs transition-colors",
                  isActive ? "bg-card text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="code-editor-active-tab"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    className="absolute inset-x-0 top-0 h-0.5 bg-gradient-brand"
                    aria-hidden="true"
                  />
                )}
                <Icon className="size-3.5 shrink-0" />
                <span className="max-w-40 truncate">{path.split("/").pop()}</span>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(path);
                  }}
                  className="rounded p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100"
                  aria-label={`Close ${path}`}
                >
                  <X className="size-3" />
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 px-1.5">
          <Button variant={wordWrap ? "secondary" : "ghost"} size="icon" className="size-7" onClick={() => setWordWrap((v) => !v)} aria-label="Toggle word wrap">
            <WrapText className="size-3.5" />
          </Button>
          <Button variant={minimapEnabled ? "secondary" : "ghost"} size="icon" className="size-7" onClick={() => setMinimapEnabled((v) => !v)} aria-label="Toggle minimap">
            <MapIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={handleCopy} aria-label="Copy file contents">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={handleDownload} aria-label="Download file">
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          key={activePath}
          path={activePath}
          language={monacoLanguageForPath(activePath)}
          value={activeContent}
          theme={mounted && resolvedTheme === "dark" ? "vs-dark" : "light"}
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: minimapEnabled },
            wordWrap: wordWrap ? "on" : "off",
            lineNumbers: "on",
            fontSize: 13,
            scrollBeyondLastLine: false,
            renderLineHighlight: "none",
            automaticLayout: true,
          }}
          loading={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading editor…</div>}
        />
      </div>
    </div>
  );
}
