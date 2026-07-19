"use client";

import * as React from "react";
import { DiffEditor } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { FilePlus2, FileMinus2, FileDiff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { cn } from "@/lib/utils/cn";
import { diffFileManifests } from "@/features/generated-project/lib/diff-file-manifests";
import { monacoLanguageForPath } from "@/features/generated-project/lib/file-language";

interface DiffViewerProps {
  leftLabel: string;
  rightLabel: string;
  leftFiles: Map<string, string>;
  rightFiles: Map<string, string>;
}

/** Version Comparison: a changed/added/removed file list plus a side-by-side Monaco diff for whichever file is selected. */
export function DiffViewer({ leftLabel, rightLabel, leftFiles, rightFiles }: DiffViewerProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const diff = React.useMemo(() => diffFileManifests(leftFiles, rightFiles), [leftFiles, rightFiles]);
  const changedAndAdded = [...diff.changed, ...diff.added, ...diff.removed].sort();

  const [selectedPath, setSelectedPath] = React.useState<string | null>(changedAndAdded[0] ?? null);
  React.useEffect(() => {
    if (selectedPath && changedAndAdded.includes(selectedPath)) return;
    setSelectedPath(changedAndAdded[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftFiles, rightFiles]);

  if (changedAndAdded.length === 0) {
    return <EmptyState icon={FileDiff} title="No differences" description={`${leftLabel} and ${rightLabel} produced identical files.`} className="h-full" />;
  }

  return (
    <div className="flex h-full min-h-0 gap-3">
      <div className="w-56 shrink-0 space-y-3 overflow-y-auto border-r border-border pr-3">
        <DiffFileGroup label="Changed" paths={diff.changed} selectedPath={selectedPath} onSelect={setSelectedPath} tone="warning" />
        <DiffFileGroup label="Added" paths={diff.added} selectedPath={selectedPath} onSelect={setSelectedPath} tone="success" />
        <DiffFileGroup label="Removed" paths={diff.removed} selectedPath={selectedPath} onSelect={setSelectedPath} tone="destructive" />
      </div>

      <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-border">
        {selectedPath ? (
          <DiffEditor
            key={selectedPath}
            original={leftFiles.get(selectedPath) ?? ""}
            modified={rightFiles.get(selectedPath) ?? ""}
            language={monacoLanguageForPath(selectedPath)}
            theme={mounted && resolvedTheme === "dark" ? "vs-dark" : "light"}
            options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
            loading={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading diff…</div>}
          />
        ) : (
          <EmptyState title="Select a file" description="Pick a changed, added, or removed file to view its diff." className="h-full" />
        )}
      </div>
    </div>
  );
}

function DiffFileGroup({
  label,
  paths,
  selectedPath,
  onSelect,
  tone,
}: {
  label: string;
  paths: string[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  tone: "warning" | "success" | "destructive";
}) {
  if (paths.length === 0) return null;
  const Icon = tone === "success" ? FilePlus2 : tone === "destructive" ? FileMinus2 : FileDiff;

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {label}
        <Badge variant={tone} className="h-4 px-1.5 text-[10px]">
          {paths.length}
        </Badge>
      </div>
      <div className="space-y-0.5">
        {paths.map((path) => (
          <button
            key={path}
            type="button"
            onClick={() => onSelect(path)}
            className={cn(
              "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs",
              path === selectedPath ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
            )}
          >
            <Icon className="size-3 shrink-0 text-muted-foreground" />
            <span className="truncate">{path}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
