"use client";

import { useParams } from "next/navigation";
import { AssistantWorkspace } from "@/features/ai-assistant/components/assistant-workspace";

export default function AiAssistantPage() {
  const params = useParams<{ projectId: string }>();
  return <AssistantWorkspace projectId={params.projectId} />;
}
