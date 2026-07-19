"use client";

import { motion } from "framer-motion";
import { BrandMark } from "@/components/brand/brand-mark";
import { Wordmark, Tagline } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils/cn";

interface SplashScreenProps {
  className?: string;
}

/**
 * Full-viewport branded loading moment - used for top-level route suspense
 * (app/loading.tsx) instead of a bare spinner, so a cold load still reads as
 * "Research2Code" rather than a blank flash.
 */
export function SplashScreen({ className }: SplashScreenProps) {
  return (
    <div className={cn("relative flex min-h-svh flex-col items-center justify-center gap-4 overflow-hidden bg-background", className)}>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-gradient-brand opacity-20 blur-3xl"
        aria-hidden="true"
      />
      <motion.div
        role="status"
        aria-label="Loading Research2Code"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <BrandMark size={40} interactive={false} />
      </motion.div>
      <div className="relative flex flex-col items-center gap-1">
        <Wordmark size="lg" />
        <Tagline />
      </div>
    </div>
  );
}
