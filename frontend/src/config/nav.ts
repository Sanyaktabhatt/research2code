import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  FileText,
  FlaskConical,
  FolderCode,
  LayoutDashboard,
  MessageSquareText,
  Network,
  Package,
} from "lucide-react";

export interface WorkspaceTab {
  id: string;
  label: string;
  /** null = the project's root path (Overview); every other tab is a sub-route. */
  segment: string | null;
  icon: LucideIcon;
  /** Ctrl/Cmd+<shortcut> jumps to this tab. */
  shortcut: number;
}

/** The Project Workspace's tab set - one entry per Ctrl+1..8 shortcut, in order. */
export const WORKSPACE_TABS: WorkspaceTab[] = [
  { id: "overview", label: "Overview", segment: null, icon: LayoutDashboard, shortcut: 1 },
  { id: "paper", label: "Paper", segment: "papers", icon: FileText, shortcut: 2 },
  { id: "knowledge", label: "Knowledge", segment: "knowledge", icon: BrainCircuit, shortcut: 3 },
  { id: "graph", label: "Knowledge Graph", segment: "graph", icon: Network, shortcut: 4 },
  { id: "ai-assistant", label: "AI Assistant", segment: "rag", icon: MessageSquareText, shortcut: 5 },
  { id: "generated-project", label: "Generated Project", segment: "codegen", icon: FolderCode, shortcut: 6 },
  { id: "experiments", label: "Experiments", segment: "runs", icon: FlaskConical, shortcut: 7 },
  { id: "artifacts", label: "Artifacts", segment: "artifacts", icon: Package, shortcut: 8 },
];

export function workspaceTabHref(projectId: string, tab: WorkspaceTab): string {
  return tab.segment ? `/projects/${projectId}/${tab.segment}` : `/projects/${projectId}`;
}
