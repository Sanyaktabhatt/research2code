"use client";

import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/feedback/coming-soon";

export default function PaperDetailPage() {
  return (
    <ComingSoon
      icon={FileText}
      title="Paper detail"
      description="Parsed sections, figures, and extraction status for this paper."
    />
  );
}
