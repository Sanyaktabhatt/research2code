"use client";

import { useParams } from "next/navigation";
import { PaperViewer } from "@/features/paper-viewer/components/paper-viewer";

export default function PapersPage() {
  const params = useParams<{ projectId: string }>();
  return <PaperViewer projectId={params.projectId} />;
}
