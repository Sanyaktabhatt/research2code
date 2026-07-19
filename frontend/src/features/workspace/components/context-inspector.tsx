"use client";

import { useParams, usePathname } from "next/navigation";
import { MousePointerClick } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { WORKSPACE_TABS } from "@/config/nav";
import { useWorkspaceInspectorStore } from "@/stores/workspace-inspector-store";
import { formatBytes, formatDate } from "@/lib/utils/formatters";
import { projectStatusToStage } from "@/lib/utils/status-mapping";
import { StageBadge } from "@/components/ui/stage-badge";
import { MetadataCard } from "@/features/paper-viewer/components/metadata-card";
import { KnowledgeSidebar } from "@/features/paper-viewer/components/knowledge-sidebar";
import { EntityInspectorDetail } from "@/features/knowledge-explorer/components/entity-inspector-detail";
import type { Project } from "@/types/domain";

function isTabActive(pathname: string, projectId: string, segment: string | null): boolean {
  const href = segment ? `/projects/${projectId}/${segment}` : `/projects/${projectId}`;
  return segment ? pathname.startsWith(href) : pathname === href;
}

interface InspectorFieldProps {
  label: string;
  value: React.ReactNode;
}

function InspectorField({ label, value }: InspectorFieldProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">{label}</p>
      <div className="mt-1 text-sm leading-relaxed">{value}</div>
    </div>
  );
}

function NothingSelected({ hint }: { hint: string }) {
  return <EmptyState icon={MousePointerClick} title="Nothing selected" description={hint} />;
}

interface ContextInspectorProps {
  project: Project;
}

/**
 * Reads the active tab from the URL and the current selection from
 * useWorkspaceInspectorStore. Feature pages built later call
 * setSelection(...) when the user picks something; until then every
 * non-overview tab renders its own "nothing selected" state.
 */
export function ContextInspector({ project }: ContextInspectorProps) {
  const pathname = usePathname();
  const params = useParams<{ projectId: string }>();
  const selection = useWorkspaceInspectorStore((s) => s.selection);

  const activeTab = WORKSPACE_TABS.find((tab) => isTabActive(pathname, params.projectId, tab.segment)) ?? WORKSPACE_TABS[0]!;

  switch (activeTab.id) {
    case "overview":
      return (
        <div className="space-y-4">
          <InspectorField label="Project" value={project.name} />
          <InspectorField label="Status" value={<StageBadge status={projectStatusToStage(project.status)} label={project.status} />} />
          <InspectorField label="Created" value={formatDate(project.created_at)} />
          <InspectorField label="Last updated" value={formatDate(project.updated_at)} />
          <InspectorField label="Description" value={project.description || <span className="text-muted-foreground">No description</span>} />
        </div>
      );

    case "paper":
      if (selection?.tab !== "paper") return <NothingSelected hint="Upload a paper to see its metadata here." />;
      return (
        <div className="space-y-6">
          <MetadataCard metadata={selection.metadata} focus={selection.focus} />
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Related knowledge</p>
            <KnowledgeSidebar knowledge={selection.relatedKnowledge} />
          </div>
        </div>
      );

    case "knowledge":
      if (selection?.tab !== "knowledge") return <NothingSelected hint="Select an extracted entity to see its confidence and relationships." />;
      return <EntityInspectorDetail {...selection} />;

    case "graph":
      if (selection?.tab !== "graph") return <NothingSelected hint="Select a node in the graph to inspect its properties and edges." />;
      return (
        <div className="space-y-4">
          <InspectorField label="Node" value={selection.nodeKey} />
          <InspectorField
            label="Labels"
            value={
              <div className="flex flex-wrap gap-1">
                {selection.labels.map((label) => (
                  <Badge key={label} variant="secondary">{label}</Badge>
                ))}
              </div>
            }
          />
          <InspectorField label="Incoming edges" value={selection.incoming} />
          <InspectorField label="Outgoing edges" value={selection.outgoing} />
          <InspectorField
            label="Properties"
            value={
              <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
                {JSON.stringify(selection.properties, null, 2)}
              </pre>
            }
          />
        </div>
      );

    case "ai-assistant":
      if (selection?.tab !== "ai-assistant") return <NothingSelected hint="Ask a question to see retrieved citations and referenced entities." />;
      return (
        <div className="space-y-4">
          <InspectorField
            label="Retrieved citations"
            value={
              <ul className="space-y-2">
                {selection.citations.map((citation) => (
                  <li key={citation.sourceRef} className="rounded-md border border-border p-2">
                    <p className="text-xs font-medium">{citation.sourceRef}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{citation.content}</p>
                  </li>
                ))}
              </ul>
            }
          />
          <InspectorField
            label="Referenced entities"
            value={
              <div className="flex flex-wrap gap-1">
                {selection.entities.map((entity) => (
                  <Badge key={entity} variant="secondary">{entity}</Badge>
                ))}
              </div>
            }
          />
        </div>
      );

    case "generated-project":
      if (selection?.tab !== "generated-project") return <NothingSelected hint="Select a file in the generated project to inspect it." />;
      return (
        <div className="space-y-4">
          <InspectorField label="File" value={<code className="text-xs">{selection.filePath}</code>} />
          <InspectorField label="Language" value={selection.language} />
          <InspectorField label="Size" value={formatBytes(selection.sizeBytes)} />
          <InspectorField label="Generation source" value={selection.generationSource} />
          <InspectorField
            label="Quality score"
            value={selection.qualityScore !== null ? `${Math.round(selection.qualityScore * 100)}%` : "—"}
          />
          <InspectorField label="Related paper section" value={selection.relatedSection ?? <span className="text-muted-foreground">Not found</span>} />
          <InspectorField
            label="Related knowledge entities"
            value={
              selection.relatedEntities.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selection.relatedEntities.map((entity) => (
                    <Badge key={entity} variant="secondary">{entity}</Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">None</span>
              )
            }
          />
        </div>
      );

    case "experiments":
      if (selection?.tab !== "experiments") return <NothingSelected hint="Select a run to see its metadata, hardware, and metrics." />;
      return (
        <div className="space-y-4">
          <InspectorField label="Run" value={`v${selection.version} (${selection.status})`} />
          <InspectorField label="Hardware" value={selection.hardware} />
          <InspectorField label="Generated project version" value={`v${selection.generatedProjectVersion}`} />
          <InspectorField
            label="Knowledge extraction version"
            value={selection.knowledgeExtractionVersion !== null ? `v${selection.knowledgeExtractionVersion}` : "—"}
          />
          <InspectorField label="Docker image" value={selection.dockerImage ? <code className="text-xs">{selection.dockerImage}</code> : "—"} />
          <InspectorField
            label="Resource summary"
            value={
              Object.keys(selection.resourceSummary).length > 0 ? (
                <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
                  {JSON.stringify(selection.resourceSummary, null, 2)}
                </pre>
              ) : (
                <span className="text-muted-foreground">No resource data captured for this run</span>
              )
            }
          />
        </div>
      );

    case "artifacts":
      if (selection?.tab !== "artifacts") return <NothingSelected hint="Select an artifact to see its file metadata." />;
      return (
        <div className="space-y-4">
          <InspectorField label="File" value={selection.fileName} />
          <InspectorField label="Category" value={selection.category} />
          <InspectorField label="Pipeline stage" value={selection.pipelineStage} />
          <InspectorField label="Content type" value={selection.contentType ?? "—"} />
          <InspectorField label="Size" value={selection.sizeBytes !== null ? formatBytes(selection.sizeBytes) : "—"} />
          <InspectorField label="Version" value={selection.version !== null ? `v${selection.version}` : "—"} />
          <InspectorField label="Created" value={selection.createdAt ? formatDate(selection.createdAt) : "—"} />
          <InspectorField label="Generation source" value={selection.generationSource} />
          <InspectorField label="Related project" value={selection.relatedProject ?? "—"} />
          <InspectorField label="Related paper" value={selection.relatedPaper ?? "—"} />
          <InspectorField label="Related execution" value={selection.relatedExecution ?? "—"} />
        </div>
      );

    default:
      return null;
  }
}
