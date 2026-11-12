"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

const STEPS = ["Parse the paper", "Extract the methodology", "Generate the project", "Run the experiment"];

/** Auth-page brand panel: Eq. (1) from the Attention paper with a highlighter that steps through its terms. */
export function EquationPanel() {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((t) => (t + 1) % 4), 1800);
    return () => window.clearInterval(id);
  }, []);

  const mark = (i: number, children: React.ReactNode, extra?: string) => (
    <span className={cn("rounded-[2px] px-[2px] transition-colors duration-500", active === i ? "bg-[#FFE14A] text-[#111]" : "", extra)}>
      {children}
    </span>
  );

  return (
    <div className="max-w-md">
      <div className="rise flex items-center gap-4 text-[30px] text-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        {mark(2, "softmax")}
        <span className="text-[38px] font-light leading-none text-white/60">(</span>
        <span className="inline-flex flex-col items-center leading-tight">
          {mark(0, <span><i>QK</i><sup className="text-[17px]">T</sup></span>, "border-b border-white/70 pb-1")}
          {mark(1, <span className="mt-1 inline-block">√<i>d</i><sub className="text-[17px]">k</sub></span>)}
        </span>
        <span className="text-[38px] font-light leading-none text-white/60">)</span>
        {mark(3, <i>V</i>)}
      </div>
      <p className="rise mt-4 font-mono text-[11px] text-white/45" style={{ "--i": 1 } as React.CSSProperties}>
        Vaswani et al., 2017 · Eq. (1) · p.4
      </p>

      <ol className="mt-12 border-t border-white/15">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className="rise flex items-center gap-4 border-b border-white/15 py-3.5 text-[15px] text-white/85"
            style={{ "--i": i + 2 } as React.CSSProperties}
          >
            <span className="font-mono text-xs text-white/40">{String(i + 1).padStart(2, "0")}</span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
