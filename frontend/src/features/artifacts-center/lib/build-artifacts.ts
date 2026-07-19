import { categorizeArtifact } from "@/features/experiments/lib/group-artifacts";
import type {
  ExecutionRun,
  ExecutionRunDetail,
  GeneratedProject,
  GeneratedProjectDetail,
  GraphSnapshot,
  KnowledgeExtraction,
  Paper,
  PaperDetail,
} from "@/types/domain";
import type { ArtifactCategory, ArtifactSource, UnifiedArtifact } from "@/features/artifacts-center/types";

const EMPTY_SOURCE: ArtifactSource = {
  paperId: null,
  knowledgeExtractionVersion: null,
  generatedProjectId: null,
  executionRunId: null,
  manifestPath: null,
};

function typeLabelForManifestPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext) return "File";
  return ext.toUpperCase();
}

export interface BuildArtifactsInput {
  papers: Paper[];
  paperDetailById: Map<string, PaperDetail>;
  knowledgeExtractionsByPaper: Map<string, KnowledgeExtraction[]>;
  graphByPaper: Map<string, GraphSnapshot | null>;
  generatedProjectsByPaper: Map<string, GeneratedProject[]>;
  generatedProjectDetailById: Map<string, GeneratedProjectDetail>;
  executionRunsByGeneratedProject: Map<string, ExecutionRun[]>;
  executionRunDetailById: Map<string, ExecutionRunDetail>;
}

/**
 * Flattens every real pipeline resource (papers -> knowledge extractions ->
 * graph -> generated projects -> execution runs -> their artifact
 * manifests) into one normalized list. Nothing here is fabricated: every
 * field traces back to a real API response captured in `BuildArtifactsInput`.
 */
export function buildArtifacts(input: BuildArtifactsInput): UnifiedArtifact[] {
  const artifacts: UnifiedArtifact[] = [];

  for (const paper of input.papers) {
    const paperLabel = paper.original_filename;

    artifacts.push({
      id: `paper:${paper.id}`,
      category: "uploaded_paper",
      stage: "Paper Upload",
      fileName: paper.original_filename,
      typeLabel: "PDF",
      sizeBytes: paper.size_bytes,
      createdAt: paper.created_at,
      version: null,
      owner: null,
      contentType: paper.content_type,
      previewKind: "none",
      inlinePreview: null,
      generationSource: "Uploaded by user",
      relatedProject: null,
      relatedPaper: paperLabel,
      relatedGeneratedProject: null,
      relatedExecution: null,
      downloadHint: "The original PDF isn't retrievable through any existing API - only its parsed/extracted output is.",
      source: { ...EMPTY_SOURCE, paperId: paper.id },
    });

    const detail = input.paperDetailById.get(paper.id);
    if (detail?.parsed_data) {
      artifacts.push({
        id: `parsed:${paper.id}`,
        category: "parsed_output",
        stage: "Parsing",
        fileName: `${paperLabel}.parsed.json`,
        typeLabel: "JSON",
        sizeBytes: null,
        createdAt: paper.created_at,
        version: null,
        owner: null,
        contentType: "application/json",
        previewKind: "json",
        inlinePreview: detail.parsed_data,
        generationSource: "Automated PDF parsing",
        relatedProject: null,
        relatedPaper: paperLabel,
        relatedGeneratedProject: null,
        relatedExecution: null,
        downloadHint: null,
        source: { ...EMPTY_SOURCE, paperId: paper.id },
      });
    }

    const extractions = input.knowledgeExtractionsByPaper.get(paper.id) ?? [];
    for (const extraction of extractions) {
      if (extraction.status !== "completed") continue;
      artifacts.push({
        id: `ke:${extraction.id}`,
        category: "knowledge_extraction",
        stage: "Knowledge Extraction",
        fileName: `${paperLabel}.knowledge.v${extraction.version}.json`,
        typeLabel: "JSON",
        sizeBytes: null,
        createdAt: extraction.created_at,
        version: extraction.version,
        owner: extraction.model_provider ? `${extraction.model_provider} / ${extraction.model_name ?? "?"}` : null,
        contentType: "application/json",
        previewKind: "json",
        inlinePreview: null,
        generationSource: extraction.model_provider ? `LLM-generated (${extraction.model_provider})` : "LLM-generated",
        relatedProject: null,
        relatedPaper: paperLabel,
        relatedGeneratedProject: null,
        relatedExecution: null,
        downloadHint: null,
        source: { ...EMPTY_SOURCE, paperId: paper.id, knowledgeExtractionVersion: extraction.version },
      });
    }

    const graph = input.graphByPaper.get(paper.id);
    if (graph) {
      artifacts.push({
        id: `graph:${paper.id}`,
        category: "knowledge_graph",
        stage: "Knowledge Graph",
        fileName: `${paperLabel}.graph.v${graph.version}.json`,
        typeLabel: "JSON",
        sizeBytes: null,
        createdAt: paper.created_at,
        version: graph.version,
        owner: null,
        contentType: "application/json",
        previewKind: "json",
        inlinePreview: graph,
        generationSource: "Derived from knowledge extraction",
        relatedProject: null,
        relatedPaper: paperLabel,
        relatedGeneratedProject: null,
        relatedExecution: null,
        downloadHint: null,
        source: { ...EMPTY_SOURCE, paperId: paper.id },
      });
    }

    const generatedProjects = input.generatedProjectsByPaper.get(paper.id) ?? [];
    for (const gp of generatedProjects) {
      const gpLabel = `${paperLabel} project v${gp.version}`;
      const gpDetail = input.generatedProjectDetailById.get(gp.id);

      artifacts.push({
        id: `gp:${gp.id}`,
        category: "generated_project",
        stage: "Code Generation",
        fileName: `generated-project-v${gp.version}.zip`,
        typeLabel: "ZIP archive",
        sizeBytes: null,
        createdAt: gp.created_at,
        version: gp.version,
        owner: gp.model_provider ? `${gp.model_provider} / ${gp.model_name ?? "?"}` : null,
        contentType: "application/zip",
        previewKind: gpDetail?.file_manifest ? "text" : "none",
        inlinePreview: gpDetail?.file_manifest ? gpDetail.file_manifest.join("\n") : null,
        generationSource: `${gp.framework} project generator`,
        relatedProject: null,
        relatedPaper: paperLabel,
        relatedGeneratedProject: gpLabel,
        relatedExecution: null,
        downloadHint: gp.status === "completed" ? null : "Only available once generation completes.",
        source: { ...EMPTY_SOURCE, paperId: paper.id, generatedProjectId: gp.id },
      });

      const runs = input.executionRunsByGeneratedProject.get(gp.id) ?? [];
      for (const run of runs) {
        const runLabel = `${gpLabel} · run v${run.version}`;
        const runDetail = input.executionRunDetailById.get(run.id);

        artifacts.push({
          id: `run:${run.id}`,
          category: "experiment_output",
          stage: "Execution",
          fileName: `execution-run-v${run.version}`,
          typeLabel: "Execution run",
          sizeBytes: null,
          createdAt: run.created_at,
          version: run.version,
          owner: null,
          contentType: null,
          previewKind: "none",
          inlinePreview: null,
          generationSource: `${run.execution_backend} · ${run.device.toUpperCase()}`,
          relatedProject: null,
          relatedPaper: paperLabel,
          relatedGeneratedProject: gpLabel,
          relatedExecution: runLabel,
          downloadHint: null,
          source: { ...EMPTY_SOURCE, paperId: paper.id, generatedProjectId: gp.id, executionRunId: run.id },
        });

        if (!runDetail) continue;

        if (runDetail.log_storage_key) {
          artifacts.push({
            id: `log:${run.id}`,
            category: "execution_log",
            stage: "Results",
            fileName: `execution-run-v${run.version}.log`,
            typeLabel: "Log",
            sizeBytes: null,
            createdAt: run.finished_at ?? run.created_at,
            version: run.version,
            owner: null,
            contentType: "text/plain",
            previewKind: "log",
            inlinePreview: null,
            generationSource: "Captured container stdout/stderr",
            relatedProject: null,
            relatedPaper: paperLabel,
            relatedGeneratedProject: gpLabel,
            relatedExecution: runLabel,
            downloadHint: null,
            source: { ...EMPTY_SOURCE, paperId: paper.id, generatedProjectId: gp.id, executionRunId: run.id },
          });
        }

        if (runDetail.tensorboard_log_dir) {
          artifacts.push({
            id: `tb:${run.id}`,
            category: "tensorboard_log",
            stage: "Results",
            fileName: `execution-run-v${run.version}.tensorboard`,
            typeLabel: "TensorBoard logs",
            sizeBytes: null,
            createdAt: run.created_at,
            version: run.version,
            owner: null,
            contentType: null,
            previewKind: "none",
            inlinePreview: null,
            generationSource: "TensorBoard callback",
            relatedProject: null,
            relatedPaper: paperLabel,
            relatedGeneratedProject: gpLabel,
            relatedExecution: runLabel,
            downloadHint: "View live in TensorBoard rather than downloading a file.",
            source: { ...EMPTY_SOURCE, paperId: paper.id, generatedProjectId: gp.id, executionRunId: run.id },
          });
        }

        if (runDetail.mlflow_run_id) {
          artifacts.push({
            id: `mlflow:${run.id}`,
            category: "mlflow_artifact",
            stage: "Results",
            fileName: `mlflow-run-${runDetail.mlflow_run_id}`,
            typeLabel: "MLflow run",
            sizeBytes: null,
            createdAt: run.created_at,
            version: run.version,
            owner: null,
            contentType: null,
            previewKind: "none",
            inlinePreview: { params: runDetail.params_snapshot, metrics: runDetail.metrics_summary },
            generationSource: "MLflow tracking",
            relatedProject: null,
            relatedPaper: paperLabel,
            relatedGeneratedProject: gpLabel,
            relatedExecution: runLabel,
            downloadHint: "View live in MLflow rather than downloading a file.",
            source: { ...EMPTY_SOURCE, paperId: paper.id, generatedProjectId: gp.id, executionRunId: run.id },
          });
        }

        for (const path of runDetail.artifact_manifest ?? []) {
          const manifestCategory = categorizeArtifact(path);
          const category: ArtifactCategory =
            manifestCategory === "checkpoint"
              ? "checkpoint"
              : manifestCategory === "exported_model"
                ? "exported_model"
                : manifestCategory === "plot"
                  ? "plot"
                  : manifestCategory === "tensorboard"
                    ? "tensorboard_log"
                    : "checkpoint";

          artifacts.push({
            id: `artifact:${run.id}:${path}`,
            category,
            stage: "Results",
            fileName: path.split("/").pop() ?? path,
            typeLabel: typeLabelForManifestPath(path),
            sizeBytes: null,
            createdAt: run.finished_at ?? run.created_at,
            version: run.version,
            owner: null,
            contentType: null,
            previewKind: "none",
            inlinePreview: null,
            generationSource: "Execution run artifact",
            relatedProject: null,
            relatedPaper: paperLabel,
            relatedGeneratedProject: gpLabel,
            relatedExecution: runLabel,
            downloadHint: "No per-artifact download endpoint exists for execution outputs yet.",
            source: { ...EMPTY_SOURCE, paperId: paper.id, generatedProjectId: gp.id, executionRunId: run.id, manifestPath: path },
          });
        }
      }
    }
  }

  return artifacts;
}
