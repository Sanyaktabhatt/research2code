"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface BrandMarkProps {
  /** Pixel size of the square tile. */
  size?: number;
  className?: string;
  /** Disables the hover micro-interaction - use in places the mark isn't interactive (e.g. a loading screen). */
  interactive?: boolean;
}

/**
 * Research2Code's mark: three ascending bars inside a rounded tile - an
 * abstract "progress/pipeline" glyph (raw research building up into
 * structured code), not a literal book/brackets/robot. Deliberately simple
 * enough to read at favicon size.
 */
export function BrandMark({ size = 28, className, interactive = true }: BrandMarkProps) {
  const bars = (
    <svg viewBox="0 0 24 24" width="58%" height="58%" fill="none" aria-hidden="true">
      <rect x="2" y="13" width="5" height="8" rx="1.6" fill="white" />
      <rect x="9" y="8" width="5" height="13" rx="1.6" fill="white" />
      <rect x="16" y="3" width="5" height="18" rx="1.6" fill="white" />
    </svg>
  );

  const tile = (
    <div
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-[28%] bg-gradient-brand shadow-glow", !interactive && className)}
      style={{ width: size, height: size }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/10" aria-hidden="true" />
      {bars}
    </div>
  );

  if (!interactive) return tile;

  return (
    <motion.div
      className={cn("inline-flex", className)}
      whileHover={{ scale: 1.06, rotate: -4 }}
      whileTap={{ scale: 0.96, rotate: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {tile}
    </motion.div>
  );
}
