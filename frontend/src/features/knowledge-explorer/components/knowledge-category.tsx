"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import { KnowledgeEntityCard } from "@/features/knowledge-explorer/components/knowledge-entity-card";
import { cn } from "@/lib/utils/cn";
import type { EntitySource, NormalizedEntity } from "@/features/knowledge-explorer/types";

interface KnowledgeCategoryProps {
  label: string;
  entities: NormalizedEntity[];
  sourceById: Map<string, EntitySource>;
  activeEntityId: string | null;
  onSelectEntity: (entity: NormalizedEntity) => void;
  onOpenInPaper?: (entity: NormalizedEntity) => void;
  defaultOpen?: boolean;
}

const VIRTUALIZE_THRESHOLD = 12;
const ENTITY_ROW_HEIGHT = 84;

export function KnowledgeCategory({
  label,
  entities,
  sourceById,
  activeEntityId,
  onSelectEntity,
  onOpenInPaper,
  defaultOpen = false,
}: KnowledgeCategoryProps) {
  const [open, setOpen] = React.useState(defaultOpen || entities.length > 0);

  if (entities.length === 0) return null;

  const addedCount = entities.filter((e) => e.diffStatus === "added").length;
  const removedCount = entities.filter((e) => e.diffStatus === "removed").length;
  const modifiedCount = entities.filter((e) => e.diffStatus === "modified").length;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
        <span className="flex items-center gap-2">
          <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
          <span className="text-sm font-semibold">{label}</span>
          <Badge variant="secondary">{entities.length}</Badge>
        </span>
        <span className="flex items-center gap-1.5">
          {addedCount > 0 && <Badge variant="success">+{addedCount}</Badge>}
          {modifiedCount > 0 && <Badge variant="warning">~{modifiedCount}</Badge>}
          {removedCount > 0 && <Badge variant="destructive">-{removedCount}</Badge>}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border p-2">
        {entities.length > VIRTUALIZE_THRESHOLD ? (
          <VirtualizedList
            items={entities}
            estimateSize={ENTITY_ROW_HEIGHT}
            className="max-h-[420px] overflow-y-auto"
            getKey={(entity) => entity.id}
            renderItem={(entity) => (
              <div className="pb-2">
                <KnowledgeEntityCard
                  entity={entity}
                  source={sourceById.get(entity.id) ?? { sectionName: null, sectionLabel: null, pageNumber: null, citation: null }}
                  isActive={entity.id === activeEntityId}
                  onSelect={onSelectEntity}
                  onOpenInPaper={onOpenInPaper}
                />
              </div>
            )}
          />
        ) : (
          <div className="space-y-2">
            {entities.map((entity) => (
              <KnowledgeEntityCard
                key={entity.id}
                entity={entity}
                source={sourceById.get(entity.id) ?? { sectionName: null, sectionLabel: null, pageNumber: null, citation: null }}
                isActive={entity.id === activeEntityId}
                onSelect={onSelectEntity}
                onOpenInPaper={onOpenInPaper}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
