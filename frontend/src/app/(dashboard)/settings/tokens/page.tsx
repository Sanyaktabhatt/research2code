"use client";

import { KeyRound } from "lucide-react";
import { ComingSoon } from "@/components/feedback/coming-soon";

export default function TokensSettingsPage() {
  return (
    <ComingSoon icon={KeyRound} title="API tokens" description="Create and manage personal access tokens." />
  );
}
