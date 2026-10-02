import type { Metadata } from "next";
import { GlobalKnowledgeGraph } from "@/features/graph-explorer/components/global-knowledge-graph";

export const metadata: Metadata = { title: "Knowledge Graph Explorer" };

export default function GlobalGraphPage() {
  return <GlobalKnowledgeGraph />;
}
