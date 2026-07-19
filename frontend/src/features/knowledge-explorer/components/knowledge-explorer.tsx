"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FileWarning, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/ui/section-card";
import { useKnowledgeExplorerData } from "@/features/knowledge-explorer/api/use-knowledge-explorer-data";
import { CATEGORY_IDS, CATEGORY_CONFIG } from "@/features/knowledge-explorer/types";
import type { NormalizedEntity } from "@/features/knowledge-explorer/types";
import { deriveEntities } from "@/features/knowledge-explorer/lib/derive-entities";
import { deriveEntitySource } from "@/features/knowledge-explorer/lib/source-mapping";
import { deriveRelatedEntities } from "@/features/knowledge-explorer/lib/derive-relationships";
import { diffEntityVersions } from "@/features/knowledge-explorer/lib/diff-versions";
import { DEFAULT_FILTERS, filterEntities, sortEntities, type SortKey } from "@/features/knowledge-explorer/lib/filter-sort";
import { KnowledgeCategory } from "@/features/knowledge-explorer/components/knowledge-category";
import { KnowledgeSearch } from "@/features/knowledge-explorer/components/knowledge-search";
import { KnowledgeFilters } from "@/features/knowledge-explorer/components/knowledge-filters";
import { VersionSelector } from "@/features/knowledge-explorer/components/version-selector";
import { ExtractionTimeline } from "@/features/knowledge-explorer/components/extraction-timeline";
import { usePaperViewerStore } from "@/features/paper-viewer/stores/use-paper-viewer-store";
import { useWorkspaceInspectorStore } from "@/stores/workspace-inspector-store";
import { workspaceTabHref } from "@/config/nav";
import { WORKSPACE_TABS } from "@/config/nav";

interface KnowledgeExplorerProps {
  projectId: string;
}

export function KnowledgeExplorer({ projectId }: KnowledgeExplorerProps) {
  const router = useRouter();
  const setInspectorSelection = useWorkspaceInspectorStore((s) => s.setSelection);

  const [selectedVersion, setSelectedVersion] = React.useState<number | null>(null);
  const [compareVersion, setCompareVersion] = React.useState<number | null>(null);
  const [filters, setFilters] = React.useState(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = React.useState<SortKey>("confidence");
  const [activeEntityId, setActiveEntityId] = React.useState<string | null>(null);

  const {
    isLoading,
    isError,
    hasPaper,
    paperId,
    paperStatus,
    parsedPaper,
    extractions,
    selectedExtracted,
    compareExtracted,
    isSelectedLoading,
  } = useKnowledgeExplorerData(projectId, selectedVersion, compareVersion);

  // Default to the latest extraction once the list loads.
  React.useEffect(() => {
    if (selectedVersion === null && extractions.length > 0) {
      setSelectedVersion(Math.max(...extractions.map((e) => e.version)));
    }
  }, [extractions, selectedVersion]);

  const baseEntities = React.useMemo(
    () => (selectedExtracted ? deriveEntities(selectedExtracted, selectedVersion ?? 0) : []),
    [selectedExtracted, selectedVersion],
  );

  const compareEntities = React.useMemo(
    () => (compareExtracted && compareVersion !== null ? deriveEntities(compareExtracted, compareVersion) : null),
    [compareExtracted, compareVersion],
  );

  const entities = React.useMemo(() => {
    if (compareEntities) return diffEntityVersions(compareEntities, baseEntities);
    return baseEntities;
  }, [baseEntities, compareEntities]);

  const sourceById = React.useMemo(() => {
    const map = new Map();
    if (!parsedPaper) return map;
    for (const entity of entities) {
      map.set(entity.id, deriveEntitySource(entity, parsedPaper.pages, parsedPaper.sections));
    }
    return map;
  }, [entities, parsedPaper]);

  const filtered = React.useMemo(() => filterEntities(entities, filters), [entities, filters]);
  const sorted = React.useMemo(() => sortEntities(filtered, sortKey, sourceById), [filtered, sortKey, sourceById]);

  const entitiesByCategory = React.useMemo(() => {
    const map = new Map<string, NormalizedEntity[]>();
    for (const category of CATEGORY_IDS) map.set(category, []);
    for (const entity of sorted) map.get(entity.category)?.push(entity);
    return map;
  }, [sorted]);

  const handleSelectEntity = (entity: NormalizedEntity) => {
    setActiveEntityId(entity.id);
    const source = sourceById.get(entity.id) ?? { sectionName: null, sectionLabel: null, pageNumber: null, citation: null };
    const relatedEntities = deriveRelatedEntities(entity, entities, sourceById);

    setInspectorSelection({
      tab: "knowledge",
      category: entity.categoryLabel,
      name: entity.name,
      confidence: entity.confidence,
      raw: entity.raw,
      source,
      relatedEntities,
      extractionVersion: entity.extractionVersion,
    });
  };

  const handleOpenInPaper = (entity: NormalizedEntity) => {
    if (!paperId) return;
    const source = sourceById.get(entity.id);
    if (!source?.pageNumber) return;

    usePaperViewerStore.getState().setCurrentPage(paperId, source.pageNumber);
    if (source.sectionName) {
      usePaperViewerStore.getState().setFocus({
        kind: "section",
        name: source.sectionName,
        startPage: source.pageNumber,
        endPage: source.pageNumber,
      });
    } else {
      usePaperViewerStore.getState().setFocus({ kind: "page", pageNumber: source.pageNumber });
    }

    const paperTab = WORKSPACE_TABS.find((t) => t.id === "paper")!;
    router.push(workspaceTabHref(projectId, paperTab));
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton className="sm:col-span-2" />
      </div>
    );
  }

  if (isError) {
    return <EmptyState icon={FileWarning} title="Couldn't load knowledge" description="Something went wrong fetching this project's extracted knowledge." />;
  }

  if (!hasPaper) {
    return <EmptyState icon={UploadCloud} title="No paper uploaded yet" description="Upload a paper first, then trigger knowledge extraction." />;
  }

  if (paperStatus !== "completed") {
    return <EmptyState icon={Loader2} title="Waiting on parsing" description="Knowledge extraction runs once the paper finishes parsing." />;
  }

  if (extractions.length === 0) {
    return <EmptyState icon={Sparkles} title="No knowledge extracted yet" description="Trigger knowledge extraction from the Overview tab's quick actions." />;
  }

  if (isSelectedLoading || !selectedExtracted) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton className="sm:col-span-2" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <KnowledgeSearch value={filters.search} onChange={(search) => setFilters((f) => ({ ...f, search }))} />
          <KnowledgeFilters filters={filters} onChange={setFilters} />
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidence">Sort by confidence</SelectItem>
              <SelectItem value="alphabetical">Sort alphabetically</SelectItem>
              <SelectItem value="source_page">Sort by source page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <VersionSelector
          extractions={extractions}
          selectedVersion={selectedVersion}
          onSelectedVersionChange={(v) => {
            setSelectedVersion(v);
            setActiveEntityId(null);
          }}
          compareVersion={compareVersion}
          onCompareVersionChange={setCompareVersion}
        />
      </div>

      <SectionCard title="Extraction history" description="Every knowledge-extraction run for this paper">
        <ExtractionTimeline extractions={extractions} />
      </SectionCard>

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <EmptyState icon={BookOpen} title="No entities match" description="Try loosening your filters or search query." />
        ) : (
          CATEGORY_IDS.map((category) => (
            <KnowledgeCategory
              key={category}
              label={CATEGORY_CONFIG[category].label}
              entities={entitiesByCategory.get(category) ?? []}
              sourceById={sourceById}
              activeEntityId={activeEntityId}
              onSelectEntity={handleSelectEntity}
              onOpenInPaper={handleOpenInPaper}
            />
          ))
        )}
      </div>
    </div>
  );
}
