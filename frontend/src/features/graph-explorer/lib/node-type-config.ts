import {
  AlertTriangle,
  Clock,
  Cpu,
  Database,
  FileText,
  Github,
  Globe,
  Gauge,
  Layers,
  Lightbulb,
  ListChecks,
  type LucideIcon,
  Ruler,
  Server,
  TrendingDown,
  Trophy,
} from "lucide-react";

/**
 * The 15 node labels `knowledge_graph_builder.py` actually merges into Neo4j
 * (see backend/app/services/knowledge_graph_builder.py) - kept as a literal
 * union so a typo here is a compile error, not a silently-uncolored node.
 */
export const NODE_TYPE_IDS = [
  "Paper",
  "Dataset",
  "Model",
  "Layer",
  "Optimizer",
  "Scheduler",
  "LossFunction",
  "Metric",
  "Result",
  "Hardware",
  "Limitation",
  "FutureWork",
  "ExternalRepository",
  "Task",
  "Domain",
] as const;

export type NodeTypeId = (typeof NODE_TYPE_IDS)[number];

export interface NodeTypeStyle {
  label: string;
  icon: LucideIcon;
  /**
   * `--node-*` CSS custom property name (see globals.css), already
   * light/dark-themed and validated for CVD-safe categorical separation -
   * see dataviz skill palette. Consumed via `hsl(var(--node-x))` inline, or
   * the matching `text-node-x`/`bg-node-x`/`border-node-x` Tailwind classes.
   */
  cssVar: string;
  tailwindToken: string;
}

export const NODE_TYPE_CONFIG: Record<NodeTypeId, NodeTypeStyle> = {
  Paper: { label: "Paper", icon: FileText, cssVar: "--node-paper", tailwindToken: "paper" },
  Dataset: { label: "Dataset", icon: Database, cssVar: "--node-dataset", tailwindToken: "dataset" },
  Model: { label: "Model", icon: Cpu, cssVar: "--node-model", tailwindToken: "model" },
  Layer: { label: "Layer", icon: Layers, cssVar: "--node-layer", tailwindToken: "layer" },
  Optimizer: { label: "Optimizer", icon: Gauge, cssVar: "--node-optimizer", tailwindToken: "optimizer" },
  Scheduler: { label: "Scheduler", icon: Clock, cssVar: "--node-scheduler", tailwindToken: "scheduler" },
  LossFunction: { label: "Loss Function", icon: TrendingDown, cssVar: "--node-loss", tailwindToken: "loss" },
  Metric: { label: "Metric", icon: Ruler, cssVar: "--node-metric", tailwindToken: "metric" },
  Result: { label: "Result", icon: Trophy, cssVar: "--node-result", tailwindToken: "result" },
  Hardware: { label: "Hardware", icon: Server, cssVar: "--node-hardware", tailwindToken: "hardware" },
  Limitation: { label: "Limitation", icon: AlertTriangle, cssVar: "--node-limitation", tailwindToken: "limitation" },
  FutureWork: { label: "Future Work", icon: Lightbulb, cssVar: "--node-futurework", tailwindToken: "futurework" },
  ExternalRepository: {
    label: "External Repository",
    icon: Github,
    cssVar: "--node-externalrepo",
    tailwindToken: "externalrepo",
  },
  Task: { label: "Task", icon: ListChecks, cssVar: "--node-task", tailwindToken: "task" },
  Domain: { label: "Domain", icon: Globe, cssVar: "--node-domain", tailwindToken: "domain" },
};

const FALLBACK_STYLE: NodeTypeStyle = {
  label: "Entity",
  icon: FileText,
  cssVar: "--muted-foreground",
  tailwindToken: "muted-foreground",
};

/** A node can carry multiple Neo4j labels (e.g. the versioning anchor); the first recognized one wins. */
export function resolveNodeType(labels: string[]): NodeTypeId | null {
  return (labels.find((label) => label in NODE_TYPE_CONFIG) as NodeTypeId | undefined) ?? null;
}

export function getNodeTypeStyle(nodeType: NodeTypeId | null): NodeTypeStyle {
  return nodeType ? NODE_TYPE_CONFIG[nodeType] : FALLBACK_STYLE;
}

/** `hsl(var(--node-x))`, for inline styles (React Flow node/minimap colors can't take Tailwind classes). */
export function nodeColorVar(nodeType: NodeTypeId | null): string {
  return `hsl(var(${getNodeTypeStyle(nodeType).cssVar}))`;
}
