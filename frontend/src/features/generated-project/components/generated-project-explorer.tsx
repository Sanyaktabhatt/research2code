"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Copy, Download, FileText, FileWarning, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StageBadge } from "@/components/ui/stage-badge";
import { formatDateTime } from "@/lib/utils/formatters";
import { generatedProjectStatusToStage } from "@/lib/utils/status-mapping";
import { useWorkspaceInspectorStore } from "@/stores/workspace-inspector-store";
import { useGeneratedProjectData } from "@/features/generated-project/api/use-generated-project-data";
import { useVersionFiles } from "@/features/generated-project/api/use-version-files";
import { buildFileTree } from "@/features/generated-project/lib/build-file-tree";
import { monacoLanguageForPath } from "@/features/generated-project/lib/file-language";
import { fileQualityScore } from "@/features/generated-project/lib/quality-grouping";
import { deriveGenerationSummary } from "@/features/generated-project/lib/generation-summary";
import { generationSourceLabel, relatedEntityNames } from "@/features/generated-project/lib/generation-source";
import { deriveFileSection } from "@/features/generated-project/lib/derive-file-source";
import { downloadFromUrl, downloadTextFile } from "@/features/generated-project/lib/download-file";
import { formatTreeAsText } from "@/features/generated-project/lib/format-tree-text";
import { RepositoryTree } from "@/features/generated-project/components/repository-tree";
import { CodeEditor } from "@/features/generated-project/components/code-editor";
import { DiffViewer } from "@/features/generated-project/components/diff-viewer";
import { QualityReport } from "@/features/generated-project/components/quality-report";
import { GenerationSummary } from "@/features/generated-project/components/generation-summary";
import { GenerationSelector } from "@/features/generated-project/components/generation-selector";

interface GeneratedProjectExplorerProps {
  projectId: string;
}

interface MetaFieldProps {
  label: string;
  value: React.ReactNode;
}

function MetaField({ label, value }: MetaFieldProps) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

/** Feature root for the Generated Project Explorer: an IDE-like workspace over one paper's versioned codegen output. */
export function GeneratedProjectExplorer({ projectId }: GeneratedProjectExplorerProps) {
  const setInspectorSelection = useWorkspaceInspectorStore((s) => s.setSelection);

  const [selectedVersion, setSelectedVersion] = React.useState<number | null>(null);
  const [compareVersion, setCompareVersion] = React.useState<number | null>(null);
  const [activeTab, setActiveTab] = React.useState("code");
  const [openPaths, setOpenPaths] = React.useState<string[]>([]);
  const [activePath, setActivePath] = React.useState<string | null>(null);

  const data = useGeneratedProjectData(projectId, selectedVersion);
  const compareData = useVersionFiles(data.paperId, compareVersion);

  React.useEffect(() => {
    if (selectedVersion === null && data.latestVersion !== null) setSelectedVersion(data.latestVersion);
  }, [selectedVersion, data.latestVersion]);

  const tree = React.useMemo(() => buildFileTree(data.project?.file_manifest ?? []), [data.project?.file_manifest]);

  const extractedKnowledgeQuery = data.extractedKnowledge;
  const summary = React.useMemo(
    () => (data.project ? deriveGenerationSummary(data.project, extractedKnowledgeQuery) : null),
    [data.project, extractedKnowledgeQuery],
  );

  const handleSelectFile = (path: string) => {
    setOpenPaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActivePath(path);
    setActiveTab("code");

    const qualityScore = data.project?.quality_report
      ? fileQualityScore(data.project.quality_report.issues, path)
      : (data.project?.quality_score ?? null);

    const content = data.files?.get(path) ?? "";
    const entities = relatedEntityNames(path, data.extractedKnowledge);
    const relatedSection =
      data.parsedPaper && entities.length > 0 ? deriveFileSection(entities, data.parsedPaper.pages, data.parsedPaper.sections) : null;

    setInspectorSelection({
      tab: "generated-project",
      filePath: path,
      language: monacoLanguageForPath(path),
      qualityScore,
      sizeBytes: new TextEncoder().encode(content).length,
      generationSource: generationSourceLabel(path),
      relatedSection,
      relatedEntities: entities,
    });
  };

  const handleCloseTab = (path: string) => {
    setOpenPaths((prev) => prev.filter((p) => p !== path));
    if (activePath === path) {
      const remaining = openPaths.filter((p) => p !== path);
      setActivePath(remaining[remaining.length - 1] ?? null);
    }
  };

  const handleDownloadZip = () => {
    if (!data.downloadUrl || !data.project) return;
    downloadFromUrl(`generated-project-v${data.project.version}.zip`, data.downloadUrl);
  };

  const handleDownloadReadme = () => {
    const readme = data.files?.get("README.md");
    if (!readme) {
      toast.error("README.md wasn't found in this generation.");
      return;
    }
    downloadTextFile("README.md", readme, "text/markdown");
  };

  const handleCopyTree = async () => {
    try {
      await navigator.clipboard.writeText(formatTreeAsText(tree));
      toast.success("Repository tree copied to clipboard.");
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  };

  if (data.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (data.isError) {
    return <EmptyState icon={FileWarning} title="Couldn't load the generated project" description="Something went wrong fetching this project's generated code." />;
  }

  if (!data.hasPaper) {
    return <EmptyState icon={UploadCloud} title="No paper uploaded yet" description="Upload a paper first, then generate a project from the Overview tab's quick actions." />;
  }

  if (data.versions.length === 0) {
    return <EmptyState icon={Boxes} title="No project generated yet" description="Ask the AI Assistant to generate a full project, or trigger it from the Overview tab." />;
  }

  if (!data.project) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const { project } = data;

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[560px] flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-3.5 shadow-xs">
        <div className="grid flex-1 grid-cols-2 gap-3">
          <MetaField label="Version" value={`v${project.version}`} />
          <MetaField label="Generated" value={formatDateTime(project.created_at)} />
          <MetaField label="Model" value={project.model_provider ? `${project.model_provider} / ${project.model_name ?? "?"}` : "—"} />
          <MetaField label="Source extraction" value={data.extractedKnowledge ? "Loaded" : "—"} />
          <MetaField label="Quality score" value={project.quality_score !== null ? `${Math.round(project.quality_score * 100)}%` : "—"} />
          <MetaField
            label="Status"
            value={<StageBadge status={generatedProjectStatusToStage(project.status)} label={project.status} />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GenerationSelector
            versions={data.versions}
            selectedVersion={selectedVersion}
            onSelectedVersionChange={setSelectedVersion}
            compareVersion={compareVersion}
            onCompareVersionChange={setCompareVersion}
          />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadZip} disabled={!data.downloadUrl}>
            <Download className="size-3.5" />
            ZIP
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadReadme} disabled={!data.files}>
            <FileText className="size-3.5" />
            README
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyTree}>
            <Copy className="size-3.5" />
            Copy tree
          </Button>
        </div>
      </div>

      {project.status !== "completed" ? (
        <EmptyState
          icon={Loader2}
          title={project.status === "failed" ? "Generation failed" : "Generation in progress"}
          description={project.error_message ?? "Files will appear here once generation completes."}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="quality">Quality report</TabsTrigger>
            <TabsTrigger value="summary">Generation summary</TabsTrigger>
            {compareVersion !== null && <TabsTrigger value="compare">Compare</TabsTrigger>}
          </TabsList>

          <TabsContent value="code" className="min-h-0 flex-1">
            {data.isFilesLoading ? (
              <CardSkeleton className="h-full" />
            ) : data.filesError || !data.files ? (
              <EmptyState icon={FileWarning} title="Couldn't load files" description={data.filesError ?? "The project archive couldn't be downloaded."} />
            ) : (
              <div className="flex h-full gap-3">
                <aside className="w-64 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/20 p-2">
                  <RepositoryTree tree={tree} generatedProjectId={project.id} selectedPath={activePath} onSelectFile={handleSelectFile} />
                </aside>
                <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border shadow-xs">
                  <CodeEditor openPaths={openPaths} activePath={activePath} files={data.files} onSelectTab={setActivePath} onCloseTab={handleCloseTab} />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="quality" className="min-h-0 flex-1 overflow-y-auto">
            {project.quality_report ? (
              <QualityReport report={project.quality_report} onSelectFile={handleSelectFile} />
            ) : (
              <EmptyState title="No quality report" description="This generation has no automated review data." />
            )}
          </TabsContent>

          <TabsContent value="summary" className="min-h-0 flex-1 overflow-y-auto">
            {summary && <GenerationSummary summary={summary} />}
          </TabsContent>

          {compareVersion !== null && (
            <TabsContent value="compare" className="min-h-0 flex-1">
              {compareData.isLoading || !data.files ? (
                <CardSkeleton className="h-full" />
              ) : !compareData.files ? (
                <EmptyState icon={FileWarning} title="Couldn't load comparison files" description="The other version's archive couldn't be downloaded." />
              ) : (
                <DiffViewer
                  leftLabel={`Version ${compareVersion}`}
                  rightLabel={`Version ${project.version}`}
                  leftFiles={compareData.files}
                  rightFiles={data.files}
                />
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
