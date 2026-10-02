import { StageBadge } from "@/components/ui/stage-badge";
import { formatDate } from "@/lib/utils/formatters";
import { paperStatusToStage, knowledgeExtractionStatusToStage } from "@/lib/utils/status-mapping";
import type { PaperInspectorMetadata } from "@/stores/workspace-inspector-store";
import type { FocusSelection } from "@/features/paper-viewer/types";

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

function FocusBlock({ focus }: { focus: FocusSelection }) {
  switch (focus.kind) {
    case "page":
      return <InspectorField label="Page" value={focus.pageNumber} />;
    case "section":
      return (
        <InspectorField
          label="Section"
          value={
            <>
              {focus.name}
              {focus.startPage !== null && focus.endPage !== null && (
                <span className="text-muted-foreground"> · pages {focus.startPage}–{focus.endPage}</span>
              )}
            </>
          }
        />
      );
    case "figure":
      return (
        <InspectorField
          label={`Figure ${focus.index + 1}`}
          value={
            <>
              Page {focus.pageNumber}
              {focus.caption && <p className="mt-0.5 text-xs text-muted-foreground">{focus.caption}</p>}
            </>
          }
        />
      );
    case "table":
      return (
        <InspectorField
          label={`Table ${focus.index + 1}`}
          value={
            <>
              Page {focus.pageNumber}
              {focus.caption && <p className="mt-0.5 text-xs text-muted-foreground">{focus.caption}</p>}
            </>
          }
        />
      );
    case "equation":
      return (
        <InspectorField
          label={`Equation ${focus.index + 1}`}
          value={
            <>
              Page {focus.pageNumber}
              <code className="mt-0.5 block truncate text-xs text-muted-foreground">{focus.text}</code>
            </>
          }
        />
      );
  }
}

interface MetadataCardProps {
  metadata: PaperInspectorMetadata;
  focus: FocusSelection | null;
}

/** Paper-level metadata + whatever's currently focused in the reading pane (page/section/figure/table/equation). */
export function MetadataCard({ metadata, focus }: MetadataCardProps) {
  return (
    <div className="space-y-4">
      <InspectorField label="Title" value={metadata.title} />
      {metadata.authors.length > 0 && (
        <InspectorField label="Authors" value={metadata.authors.join(", ")} />
      )}
      {(metadata.venue || metadata.publicationYear) && (
        <InspectorField
          label="Publication"
          value={[metadata.venue, metadata.publicationYear].filter(Boolean).join(" · ")}
        />
      )}
      {metadata.doi && <InspectorField label="DOI" value={metadata.doi} />}
      <InspectorField label="Uploaded" value={formatDate(metadata.uploadDate)} />
      <InspectorField
        label="Parse status"
        value={<StageBadge status={paperStatusToStage(metadata.parseStatus)} label={metadata.parseStatus} />}
      />
      <InspectorField
        label="Extraction status"
        value={
          metadata.extractionStatus === "not_started" ? (
            <span className="text-muted-foreground">Not started</span>
          ) : (
            <StageBadge status={knowledgeExtractionStatusToStage(metadata.extractionStatus)} label={metadata.extractionStatus} />
          )
        }
      />
      {metadata.confidence !== null && (
        <InspectorField label="Extraction confidence" value={`${Math.round(metadata.confidence * 100)}%`} />
      )}

      {focus && (
        <div className="border-t border-border pt-4">
          <FocusBlock focus={focus} />
        </div>
      )}
    </div>
  );
}
