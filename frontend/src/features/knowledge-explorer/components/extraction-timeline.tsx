import { Sparkles } from "lucide-react";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { EmptyState } from "@/components/feedback/empty-state";
import { knowledgeExtractionStatusToStage } from "@/lib/utils/status-mapping";
import type { KnowledgeExtraction } from "@/types/domain";

const TONE_FOR_STAGE = { pending: "default", running: "warning", success: "success", error: "destructive" } as const;

interface ExtractionTimelineProps {
  extractions: KnowledgeExtraction[];
}

/** Extraction history: version, model, provider, timestamp - all real fields off KnowledgeExtractionRead. */
export function ExtractionTimeline({ extractions }: ExtractionTimelineProps) {
  if (extractions.length === 0) {
    return <EmptyState icon={Sparkles} title="No extractions yet" description="Trigger knowledge extraction to see history here." />;
  }

  const items: TimelineItem[] = [...extractions]
    .sort((a, b) => b.version - a.version)
    .map((extraction) => ({
      id: extraction.id,
      icon: Sparkles,
      title: `Version ${extraction.version} · ${extraction.status}`,
      description: extraction.model_provider ? `${extraction.model_provider} · ${extraction.model_name ?? "unknown model"}` : (extraction.model_name ?? undefined),
      timestamp: extraction.created_at,
      tone: TONE_FOR_STAGE[knowledgeExtractionStatusToStage(extraction.status)],
    }));

  return <Timeline items={items} />;
}
