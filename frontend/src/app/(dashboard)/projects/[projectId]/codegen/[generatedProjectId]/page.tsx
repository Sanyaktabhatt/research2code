"use client";

import { Boxes } from "lucide-react";
import { ComingSoon } from "@/components/feedback/coming-soon";

export default function GeneratedProjectPage() {
  return (
    <ComingSoon
      icon={Boxes}
      title="Generated project"
      description="A Monaco-powered file browser over the generated codebase, with diff and download support."
    />
  );
}
