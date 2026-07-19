import { create } from "zustand";
import type { FocusSelection } from "@/features/paper-viewer/types";
import type { RelevantKnowledge } from "@/features/paper-viewer/lib/relevant-knowledge";
import type { EntitySource, RelatedEntities } from "@/features/knowledge-explorer/types";
import type { KnowledgeExtractionStatus, PaperStatus } from "@/types/domain";

export interface KnowledgeInspectorEntity {
  category: string;
  name: string;
  confidence: number;
  raw: Record<string, unknown>;
  source: EntitySource;
  relatedEntities: RelatedEntities;
  extractionVersion: number;
}

export interface PaperInspectorMetadata {
  title: string;
  authors: string[];
  venue: string | null;
  publicationYear: number | null;
  doi: string | null;
  uploadDate: string;
  parseStatus: PaperStatus;
  extractionStatus: KnowledgeExtractionStatus | "not_started";
  /** PaperMetadata.confidence from the knowledge extraction, when one exists. */
  confidence: number | null;
}

/**
 * One shape per workspace tab. Feature pages (built later) call setSelection
 * when the user selects something; until then every tab's inspector renders
 * its own "nothing selected yet" empty state. Keeping the union here (rather
 * than inside ContextInspector) means a future feature page only needs to
 * import this store, not reach into inspector UI internals.
 */
export type InspectorSelection =
  | {
      tab: "paper";
      metadata: PaperInspectorMetadata;
      focus: FocusSelection | null;
      relatedKnowledge: RelevantKnowledge | null;
    }
  | ({ tab: "knowledge" } & KnowledgeInspectorEntity)
  | {
      tab: "graph";
      nodeKey: string;
      labels: string[];
      properties: Record<string, unknown>;
      incoming: number;
      outgoing: number;
    }
  | { tab: "ai-assistant"; citations: { sourceRef: string; content: string }[]; entities: string[] }
  | {
      tab: "generated-project";
      filePath: string;
      language: string;
      qualityScore: number | null;
      sizeBytes: number;
      generationSource: string;
      relatedSection: string | null;
      relatedEntities: string[];
    }
  | {
      tab: "experiments";
      runId: string;
      version: number;
      status: string;
      hardware: string;
      dockerImage: string | null;
      generatedProjectVersion: number;
      knowledgeExtractionVersion: number | null;
      resourceSummary: Record<string, unknown>;
    }
  | {
      tab: "artifacts";
      fileName: string;
      sizeBytes: number | null;
      contentType: string | null;
      category: string;
      pipelineStage: string;
      version: number | null;
      createdAt: string | null;
      relatedProject: string | null;
      relatedPaper: string | null;
      relatedExecution: string | null;
      generationSource: string;
    };

interface WorkspaceInspectorState {
  selection: InspectorSelection | null;
  setSelection: (selection: InspectorSelection) => void;
  clear: () => void;
}

export const useWorkspaceInspectorStore = create<WorkspaceInspectorState>()((set) => ({
  selection: null,
  setSelection: (selection) => set({ selection }),
  clear: () => set({ selection: null }),
}));
