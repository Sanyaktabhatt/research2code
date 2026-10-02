"use client";

import * as React from "react";
import { AlertCircle, AlertTriangle, ChevronDown, CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils/cn";
import type { QualityGroup } from "@/features/generated-project/lib/quality-grouping";

interface ValidationCardProps {
  group: QualityGroup;
  onSelectFile?: (path: string) => void;
}

export function ValidationCard({ group, onSelectFile }: ValidationCardProps) {
  const [open, setOpen] = React.useState(group.issues.length > 0);
  const passed = group.issues.length === 0;
  const errorCount = group.issues.filter((i) => i.severity === "error").length;
  const warningCount = group.issues.length - errorCount;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left">
        {passed ? (
          <CircleCheck className="size-4 shrink-0 text-success" />
        ) : (
          <AlertCircle className="size-4 shrink-0 text-destructive" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{group.label}</p>
          <p className="truncate text-xs text-muted-foreground">{group.description}</p>
        </div>
        {passed ? (
          <Badge variant="success" className="shrink-0">
            Passed
          </Badge>
        ) : (
          <div className="flex shrink-0 gap-1">
            {errorCount > 0 && (
              <Badge variant="destructive" className="shrink-0">
                {errorCount} error{errorCount === 1 ? "" : "s"}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning" className="shrink-0">
                {warningCount} warning{warningCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
        )}
        {!passed && <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />}
      </CollapsibleTrigger>
      {!passed && (
        <CollapsibleContent className="space-y-1 border-t border-border p-2">
          {group.issues.map((issue, index) => (
            <div key={index} className="flex items-start gap-2 rounded-md p-1.5 text-xs hover:bg-muted/50">
              {issue.severity === "error" ? (
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              ) : (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              )}
              <div className="min-w-0 flex-1">
                <p>{issue.message}</p>
                {issue.file_path && (
                  <button
                    type="button"
                    onClick={() => onSelectFile?.(issue.file_path!)}
                    disabled={!onSelectFile}
                    className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground hover:text-info hover:underline disabled:no-underline"
                  >
                    {issue.file_path}
                  </button>
                )}
              </div>
            </div>
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
