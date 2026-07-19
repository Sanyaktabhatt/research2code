"use client";

import { useParams } from "next/navigation";
import { GeneratedProjectExplorer } from "@/features/generated-project/components/generated-project-explorer";

export default function GeneratedProjectPage() {
  const params = useParams<{ projectId: string }>();
  return <GeneratedProjectExplorer projectId={params.projectId} />;
}
