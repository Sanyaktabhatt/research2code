"use client";

import { useParams } from "next/navigation";
import { KnowledgeGraph } from "@/features/graph-explorer/components/knowledge-graph";

export default function GraphPage() {
  const params = useParams<{ projectId: string }>();
  return <KnowledgeGraph projectId={params.projectId} />;
}
