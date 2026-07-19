"use client";

import { useParams } from "next/navigation";
import { KnowledgeExplorer } from "@/features/knowledge-explorer/components/knowledge-explorer";

export default function KnowledgePage() {
  const params = useParams<{ projectId: string }>();
  return <KnowledgeExplorer projectId={params.projectId} />;
}
