"use client";

import { useParams } from "next/navigation";
import { ExperimentDashboard } from "@/features/experiments/components/experiment-dashboard";

export default function ExperimentsPage() {
  const params = useParams<{ projectId: string }>();
  return <ExperimentDashboard projectId={params.projectId} />;
}
