"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          {/* "user" defers to the OS prefers-reduced-motion setting for every framer-motion animation in the app. */}
          <MotionConfig reducedMotion="user">
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster position="bottom-right" />
            </TooltipProvider>
          </MotionConfig>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
