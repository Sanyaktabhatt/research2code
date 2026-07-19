import {
  Boxes,
  Braces,
  FileArchive,
  FileImage,
  FileText,
  FlaskConical,
  type LucideIcon,
  Network,
  Package,
  ScrollText,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import type { ArtifactCategory } from "@/features/artifacts-center/types";

export interface CategoryInfo {
  label: string;
  icon: LucideIcon;
}

export const CATEGORY_CONFIG: Record<ArtifactCategory, CategoryInfo> = {
  uploaded_paper: { label: "Uploaded Papers", icon: UploadCloud },
  parsed_output: { label: "Parsed Outputs", icon: FileText },
  knowledge_extraction: { label: "Knowledge Extraction Versions", icon: Sparkles },
  knowledge_graph: { label: "Knowledge Graph Snapshots", icon: Network },
  generated_project: { label: "Generated Projects", icon: FileArchive },
  experiment_output: { label: "Experiment Outputs", icon: FlaskConical },
  checkpoint: { label: "Checkpoints", icon: Package },
  exported_model: { label: "Exported Models", icon: Boxes },
  tensorboard_log: { label: "TensorBoard Logs", icon: ScrollText },
  mlflow_artifact: { label: "MLflow Artifacts", icon: Braces },
  execution_log: { label: "Execution Logs", icon: ScrollText },
  plot: { label: "Generated Plots", icon: FileImage },
};

export const ARTIFACT_CATEGORIES = Object.keys(CATEGORY_CONFIG) as ArtifactCategory[];
