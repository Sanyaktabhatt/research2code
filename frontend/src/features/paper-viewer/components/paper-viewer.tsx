"use client";

import * as React from "react";
import { FileText, FileWarning, Loader2, UploadCloud } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { CardSkeleton } from "@/components/feedback/skeletons";
import { QuickActions } from "@/features/workspace/components/quick-actions";
import { usePaperViewerData } from "@/features/paper-viewer/api/use-paper-viewer-data";
import { usePaperViewerStore } from "@/features/paper-viewer/stores/use-paper-viewer-store";
import { DocumentOutline } from "@/features/paper-viewer/components/document-outline";
import { PDFCanvas, type PDFCanvasHandle } from "@/features/paper-viewer/components/pdf-canvas";
import { deriveOutline, findSectionForPage, type OutlineEntry } from "@/features/paper-viewer/lib/derive-outline";
import { deriveRelevantKnowledge } from "@/features/paper-viewer/lib/relevant-knowledge";
import { searchPages, type SearchMatch } from "@/features/paper-viewer/lib/search-pages";
import { isTypingElement } from "@/lib/utils/guards";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useWorkspaceInspectorStore, type PaperInspectorMetadata } from "@/stores/workspace-inspector-store";
import type { EquationRef, FigureRef, TableRef } from "@/features/paper-viewer/types";

interface PaperViewerProps {
  projectId: string;
}

const FLASH_DURATION_MS = 1600;

export function PaperViewer({ projectId }: PaperViewerProps) {
  const { isLoading, isError, hasPaper, paper, parsedPaper, knowledge, extractedKnowledge } =
    usePaperViewerData(projectId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (isError) {
    return <EmptyState icon={FileWarning} title="Couldn't load the paper" description="Something went wrong fetching this project's paper." />;
  }

  if (!hasPaper || !paper) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <EmptyState icon={UploadCloud} title="No paper uploaded yet" description="Upload a paper to start reading, parsing, and extracting knowledge." />
        <QuickActions projectId={projectId} paper={undefined} knowledge={undefined} generatedProject={undefined} />
      </div>
    );
  }

  if (paper.status !== "completed") {
    return (
      <EmptyState
        icon={paper.status === "failed" ? FileWarning : Loader2}
        title={paper.status === "failed" ? "Parsing failed" : "Parsing in progress"}
        description={
          paper.status === "failed"
            ? paper.error_message ?? "The parser couldn't process this file."
            : "The paper viewer will be available once parsing completes."
        }
      />
    );
  }

  if (!parsedPaper || parsedPaper.pages.length === 0) {
    return <EmptyState icon={FileText} title="No extracted content" description="This paper parsed with no page content." />;
  }

  return (
    <PaperViewerReady
      projectId={projectId}
      paperId={paper.id}
      filename={paper.original_filename}
      paperStatus={paper.status}
      uploadDate={paper.created_at}
      parsedPaper={parsedPaper}
      knowledgeStatus={knowledge?.status ?? "not_started"}
      extractedKnowledge={extractedKnowledge}
    />
  );
}

interface PaperViewerReadyProps {
  projectId: string;
  paperId: string;
  filename: string;
  paperStatus: "pending" | "processing" | "completed" | "failed";
  uploadDate: string;
  parsedPaper: NonNullable<ReturnType<typeof usePaperViewerData>["parsedPaper"]>;
  knowledgeStatus: "pending" | "processing" | "completed" | "failed" | "not_started";
  extractedKnowledge: ReturnType<typeof usePaperViewerData>["extractedKnowledge"];
}

function PaperViewerReady({
  paperId,
  filename,
  paperStatus,
  uploadDate,
  parsedPaper,
  knowledgeStatus,
  extractedKnowledge,
}: PaperViewerReadyProps) {
  const canvasRef = React.useRef<PDFCanvasHandle>(null);
  const [activeMatchIndex, setActiveMatchIndex] = React.useState(0);
  const [flashPage, setFlashPage] = React.useState<number | null>(null);
  const flashTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const setInspectorSelection = useWorkspaceInspectorStore((s) => s.setSelection);

  const perPaper = usePaperViewerStore((s) => s.getState(paperId));
  const zoomIn = usePaperViewerStore((s) => s.zoomIn);
  const zoomOut = usePaperViewerStore((s) => s.zoomOut);
  const setCurrentPage = usePaperViewerStore((s) => s.setCurrentPage);
  const rotation = usePaperViewerStore((s) => s.rotation);
  const rotateClockwise = usePaperViewerStore((s) => s.rotateClockwise);
  const fitMode = usePaperViewerStore((s) => s.fitMode);
  const setFitMode = usePaperViewerStore((s) => s.setFitMode);
  const focus = usePaperViewerStore((s) => s.focus);
  const setFocus = usePaperViewerStore((s) => s.setFocus);
  const searchOpen = usePaperViewerStore((s) => s.searchOpen);
  const setSearchOpen = usePaperViewerStore((s) => s.setSearchOpen);
  const searchQuery = usePaperViewerStore((s) => s.searchQuery);
  const setSearchQuery = usePaperViewerStore((s) => s.setSearchQuery);

  const outline = React.useMemo(() => deriveOutline(parsedPaper.sections), [parsedPaper.sections]);

  const currentSection = React.useMemo(
    () => findSectionForPage(parsedPaper.sections, perPaper.currentPage),
    [parsedPaper.sections, perPaper.currentPage],
  );

  const flashAndJump = (pageNumber: number) => {
    setCurrentPage(paperId, pageNumber);
    setFlashPage(pageNumber);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashPage(null), FLASH_DURATION_MS);
  };

  React.useEffect(() => () => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
  }, []);

  const selectSection = (entry: OutlineEntry) => {
    setFocus({ kind: "section", name: entry.name, startPage: entry.section.start_page, endPage: entry.section.end_page });
    if (entry.section.start_page !== null) setCurrentPage(paperId, entry.section.start_page);
  };

  const selectFigure = (figure: FigureRef) => {
    setFocus({ kind: "figure", pageNumber: figure.page_number, index: figure.index, caption: figure.caption });
    flashAndJump(figure.page_number);
  };

  const selectTable = (table: TableRef) => {
    setFocus({ kind: "table", pageNumber: table.page_number, index: table.index, caption: table.caption });
    flashAndJump(table.page_number);
  };

  const selectEquation = (equation: EquationRef) => {
    setFocus({ kind: "equation", pageNumber: equation.page_number, index: equation.index, text: equation.text });
    flashAndJump(equation.page_number);
  };

  const selectPage = (pageNumber: number) => {
    const clamped = Math.min(parsedPaper.page_count, Math.max(1, pageNumber));
    setCurrentPage(paperId, clamped);
    setFocus({ kind: "page", pageNumber: clamped });
  };

  const matches = React.useMemo(() => searchPages(parsedPaper.pages, searchQuery), [parsedPaper.pages, searchQuery]);

  React.useEffect(() => setActiveMatchIndex(0), [searchQuery]);

  const goToMatch = (index: number) => {
    const match = matches[index];
    if (!match) return;
    setActiveMatchIndex(index);
    setCurrentPage(paperId, match.pageNumber);
  };

  const relevantSectionText = focus?.kind === "section" ? outline.find((o) => o.name === focus.name)?.section.text : currentSection?.text;
  const relatedKnowledge = React.useMemo(
    () => deriveRelevantKnowledge(extractedKnowledge, relevantSectionText ?? null),
    [extractedKnowledge, relevantSectionText],
  );

  const metadata: PaperInspectorMetadata = React.useMemo(
    () => ({
      title: extractedKnowledge?.metadata?.title || filename,
      authors: extractedKnowledge?.metadata?.authors ?? [],
      venue: extractedKnowledge?.metadata?.venue ?? null,
      publicationYear: extractedKnowledge?.metadata?.publication_year ?? null,
      doi: extractedKnowledge?.metadata?.doi ?? null,
      uploadDate,
      parseStatus: paperStatus,
      extractionStatus: knowledgeStatus,
      confidence: extractedKnowledge?.metadata?.confidence ?? null,
    }),
    [extractedKnowledge, filename, uploadDate, paperStatus, knowledgeStatus],
  );

  React.useEffect(() => {
    setInspectorSelection({ tab: "paper", metadata, focus, relatedKnowledge });
  }, [setInspectorSelection, metadata, focus, relatedKnowledge]);

  const activeSectionName = focus?.kind === "section" ? focus.name : (currentSection?.name ?? null);
  const activeFigureIndex =
    focus?.kind === "figure" ? parsedPaper.figures.findIndex((f) => f.page_number === focus.pageNumber && f.index === focus.index) : null;
  const activeTableIndex =
    focus?.kind === "table" ? parsedPaper.tables.findIndex((t) => t.page_number === focus.pageNumber && t.index === focus.index) : null;
  const activeEquationIndex =
    focus?.kind === "equation"
      ? parsedPaper.equations.findIndex((e) => e.page_number === focus.pageNumber && e.index === focus.index)
      : null;

  const highlightRange =
    focus?.kind === "section" && focus.startPage !== null && focus.endPage !== null
      ? { start: focus.startPage, end: focus.endPage }
      : null;

  // Keyboard shortcuts
  useKeyboardShortcut({ key: "f", mod: true }, () => setSearchOpen(true));
  useKeyboardShortcut({ key: "f", mod: false }, () => {
    if (isTypingElement(document.activeElement)) return;
    canvasRef.current?.toggleFullscreen();
  });
  useKeyboardShortcut({ key: "PageDown", mod: false }, () => {
    if (isTypingElement(document.activeElement)) return;
    selectPage(perPaper.currentPage + 1);
  });
  useKeyboardShortcut({ key: "PageUp", mod: false }, () => {
    if (isTypingElement(document.activeElement)) return;
    selectPage(perPaper.currentPage - 1);
  });
  useKeyboardShortcut({ key: "+", mod: false }, () => {
    if (isTypingElement(document.activeElement)) return;
    zoomIn(paperId);
  });
  useKeyboardShortcut({ key: "=", mod: false }, () => {
    if (isTypingElement(document.activeElement)) return;
    zoomIn(paperId);
  });
  useKeyboardShortcut({ key: "-", mod: false }, () => {
    if (isTypingElement(document.activeElement)) return;
    zoomOut(paperId);
  });

  return (
    <div className="flex h-full min-h-0 gap-4">
      <div className="w-72 shrink-0 overflow-y-auto rounded-lg border border-border bg-card p-3 scrollbar-thin">
        <DocumentOutline
          outline={outline}
          activeSectionName={activeSectionName}
          onSelectSection={selectSection}
          figures={parsedPaper.figures}
          activeFigureIndex={activeFigureIndex}
          onSelectFigure={selectFigure}
          tables={parsedPaper.tables}
          activeTableIndex={activeTableIndex}
          onSelectTable={selectTable}
          equations={parsedPaper.equations}
          activeEquationIndex={activeEquationIndex}
          onSelectEquation={selectEquation}
        />
      </div>

      <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-border shadow-xs">
        <PDFCanvas
          ref={canvasRef}
          pages={parsedPaper.pages}
          currentPage={perPaper.currentPage}
          onPageChange={selectPage}
          zoom={perPaper.zoom}
          onZoomIn={() => zoomIn(paperId)}
          onZoomOut={() => zoomOut(paperId)}
          rotation={rotation}
          onRotate={rotateClockwise}
          fitMode={fitMode}
          onFitModeChange={setFitMode}
          highlightRange={highlightRange}
          flashPage={flashPage}
          searchOpen={searchOpen}
          onOpenSearch={() => setSearchOpen(true)}
          onCloseSearch={() => setSearchOpen(false)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          matches={matches}
          activeMatchIndex={activeMatchIndex}
          onNextMatch={() => goToMatch((activeMatchIndex + 1) % Math.max(matches.length, 1))}
          onPrevMatch={() => goToMatch((activeMatchIndex - 1 + Math.max(matches.length, 1)) % Math.max(matches.length, 1))}
          onSelectMatch={(match: SearchMatch) => goToMatch(matches.indexOf(match))}
        />
      </div>
    </div>
  );
}
