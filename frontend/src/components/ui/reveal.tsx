"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Fades and lifts its children into place once, the first time they scroll
 * into view, and sets `data-inview="true"` so CSS can start child animations
 * (e.g. `.grow-x`, `.log-line`) at the same moment.
 */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [seen, setSeen] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -60px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-inview={seen ? "true" : "false"}
      className={cn("reveal", className)}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
