import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/features/knowledge-explorer/components/confidence-badge";
import { ConfidenceBar } from "@/features/knowledge-explorer/components/confidence-bar";
import type { KnowledgeInspectorEntity } from "@/stores/workspace-inspector-store";

interface InspectorFieldProps {
  label: string;
  value: React.ReactNode;
}

function InspectorField({ label, value }: InspectorFieldProps) {
  return (
    <div>
      <p className="section-label">{label}</p>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}

function RelatedGroup({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {values.map((v) => (
          <Badge key={v} variant="secondary">
            {v}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/** Renders a knowledge entity's full detail for the shared Context Inspector. */
export function EntityInspectorDetail({
  category,
  name,
  confidence,
  raw,
  source,
  relatedEntities,
  extractionVersion,
}: KnowledgeInspectorEntity) {
  const hasRelated =
    relatedEntities.datasets.length > 0 ||
    relatedEntities.models.length > 0 ||
    relatedEntities.metrics.length > 0 ||
    relatedEntities.losses.length > 0 ||
    relatedEntities.optimizers.length > 0;

  return (
    <div className="space-y-4">
      <InspectorField label="Category" value={category} />
      <InspectorField label="Name" value={name} />
      <InspectorField
        label="Confidence"
        value={
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <ConfidenceBadge confidence={confidence} />
            </div>
            <ConfidenceBar confidence={confidence} />
          </div>
        }
      />

      {source.sectionLabel && <InspectorField label="Source section" value={source.sectionLabel} />}
      {source.pageNumber !== null && <InspectorField label="Page" value={source.pageNumber} />}
      {source.citation && (
        <InspectorField
          label="Source citation"
          value={<p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">{source.citation}</p>}
        />
      )}

      <InspectorField label="Extraction version" value={`v${extractionVersion}`} />

      {hasRelated && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="section-label">Related entities</p>
          <RelatedGroup label="Datasets" values={relatedEntities.datasets} />
          <RelatedGroup label="Models" values={relatedEntities.models} />
          <RelatedGroup label="Metrics" values={relatedEntities.metrics} />
          <RelatedGroup label="Losses" values={relatedEntities.losses} />
          <RelatedGroup label="Optimizers" values={relatedEntities.optimizers} />
        </div>
      )}

      <div className="border-t border-border pt-3">
        <p className="mb-1.5 section-label">Full metadata</p>
        <pre className="max-h-64 overflow-auto rounded-md bg-muted p-2 text-xs">{JSON.stringify(raw, null, 2)}</pre>
      </div>
    </div>
  );
}
