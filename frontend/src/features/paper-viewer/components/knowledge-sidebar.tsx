import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { Sparkles } from "lucide-react";
import type { RelevantKnowledge } from "@/features/paper-viewer/lib/relevant-knowledge";

interface KnowledgeGroupProps {
  label: string;
  values: string[];
}

function KnowledgeGroup({ label, values }: KnowledgeGroupProps) {
  if (values.length === 0) return null;
  return (
    <div>
      <p className="section-label">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {values.map((value) => (
          <Badge key={value} variant="secondary">
            {value}
          </Badge>
        ))}
      </div>
    </div>
  );
}

interface KnowledgeSidebarProps {
  knowledge: RelevantKnowledge | null;
}

/** Extracted entities/datasets/models/metrics/losses/optimizers for the current focus. */
export function KnowledgeSidebar({ knowledge }: KnowledgeSidebarProps) {
  if (!knowledge) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No knowledge extracted yet"
        description="Related entities appear once knowledge extraction completes."
      />
    );
  }

  const hasAny =
    knowledge.entities.length > 0 ||
    knowledge.datasets.length > 0 ||
    knowledge.models.length > 0 ||
    knowledge.metrics.length > 0 ||
    knowledge.losses.length > 0 ||
    knowledge.optimizers.length > 0;

  if (!hasAny) {
    return <EmptyState icon={Sparkles} title="Nothing extracted" description="No entities were extracted from this paper." />;
  }

  return (
    <div className="space-y-3">
      {!knowledge.scopedToSection && (
        <p className="text-xs text-muted-foreground">
          Showing the full paper&apos;s extracted knowledge - nothing here specifically mentions the selected section.
        </p>
      )}
      <KnowledgeGroup label="Entities" values={knowledge.entities} />
      <KnowledgeGroup label="Datasets" values={knowledge.datasets} />
      <KnowledgeGroup label="Models" values={knowledge.models} />
      <KnowledgeGroup label="Metrics" values={knowledge.metrics} />
      <KnowledgeGroup label="Losses" values={knowledge.losses} />
      <KnowledgeGroup label="Optimizers" values={knowledge.optimizers} />
    </div>
  );
}
