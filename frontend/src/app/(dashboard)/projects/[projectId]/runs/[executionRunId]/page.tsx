"use client";

import { FlaskConical } from "lucide-react";
import { ComingSoon } from "@/components/feedback/coming-soon";

export default function ExecutionRunDetailPage() {
  return (
    <ComingSoon
      icon={FlaskConical}
      title="Execution run"
      description="Live logs, Recharts metric curves, and TensorBoard access for this run."
    />
  );
}
