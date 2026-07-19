"use client";

import { useParams } from "next/navigation";
import { ArtifactsCenter } from "@/features/artifacts-center/components/artifacts-center";

export default function ArtifactsPage() {
  const params = useParams<{ projectId: string }>();
  return <ArtifactsCenter projectId={params.projectId} />;
}
