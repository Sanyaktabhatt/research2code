"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionTree } from "@/features/paper-viewer/components/section-tree";
import { FigureGallery } from "@/features/paper-viewer/components/figure-gallery";
import { TableList } from "@/features/paper-viewer/components/table-list";
import { EquationList } from "@/features/paper-viewer/components/equation-list";
import type { OutlineEntry } from "@/features/paper-viewer/lib/derive-outline";
import type { EquationRef, FigureRef, TableRef } from "@/features/paper-viewer/types";

interface DocumentOutlineProps {
  outline: OutlineEntry[];
  activeSectionName: string | null;
  onSelectSection: (entry: OutlineEntry) => void;
  figures: FigureRef[];
  activeFigureIndex: number | null;
  onSelectFigure: (figure: FigureRef) => void;
  tables: TableRef[];
  activeTableIndex: number | null;
  onSelectTable: (table: TableRef) => void;
  equations: EquationRef[];
  activeEquationIndex: number | null;
  onSelectEquation: (equation: EquationRef) => void;
}

/** The workspace's left panel for the Paper tab: outline, figures, tables, equations as sub-tabs. */
export function DocumentOutline({
  outline,
  activeSectionName,
  onSelectSection,
  figures,
  activeFigureIndex,
  onSelectFigure,
  tables,
  activeTableIndex,
  onSelectTable,
  equations,
  activeEquationIndex,
  onSelectEquation,
}: DocumentOutlineProps) {
  return (
    <Tabs defaultValue="outline">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="outline">Outline</TabsTrigger>
        <TabsTrigger value="figures">Figures</TabsTrigger>
        <TabsTrigger value="tables">Tables</TabsTrigger>
        <TabsTrigger value="equations">Eqns</TabsTrigger>
      </TabsList>

      <TabsContent value="outline">
        <SectionTree entries={outline} activeName={activeSectionName} onSelect={onSelectSection} />
      </TabsContent>
      <TabsContent value="figures">
        <FigureGallery figures={figures} activeIndex={activeFigureIndex} onSelect={onSelectFigure} />
      </TabsContent>
      <TabsContent value="tables">
        <TableList tables={tables} activeIndex={activeTableIndex} onSelect={onSelectTable} />
      </TabsContent>
      <TabsContent value="equations">
        <EquationList equations={equations} activeIndex={activeEquationIndex} onSelect={onSelectEquation} />
      </TabsContent>
    </Tabs>
  );
}
