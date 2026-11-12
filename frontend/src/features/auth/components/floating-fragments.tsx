"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Auth-page backdrop: fragments of maths and the PyTorch they turn into,
 * drifting slowly around the centered form while a highlighter hops between
 * them. Purely decorative - hidden from assistive tech, still under reduced motion.
 */

type Fragment = { text: React.ReactNode; kind: "math" | "code"; x: string; y: string; size?: "sm" | "lg"; wide?: boolean };

const FRAGMENTS: Fragment[] = [
  { text: <>θ<sub>t</sub> ← θ<sub>t−1</sub> − α∇L</>, kind: "math", x: "7%", y: "16%", size: "lg" },
  { text: "optimizer.step()", kind: "code", x: "15%", y: "34%" },
  { text: <>σ(Wx + b)</>, kind: "math", x: "5%", y: "52%", size: "lg" },
  { text: "x = F.relu(self.conv1(x))", kind: "code", x: "9%", y: "70%", wide: true },
  { text: <>E[x<sup>2</sup>] − E[x]<sup>2</sup></>, kind: "math", x: "17%", y: "86%" },
  { text: "loss.backward()", kind: "code", x: "74%", y: "13%" },
  { text: <>m̂<sub>t</sub> = m<sub>t</sub> / (1 − β<sub>1</sub><sup>t</sup>)</>, kind: "math", x: "76%", y: "30%", size: "lg" },
  { text: "torch.manual_seed(0)", kind: "code", x: "81%", y: "49%", wide: true },
  { text: <>∇<sub>θ</sub> f(θ)</>, kind: "math", x: "73%", y: "66%", size: "lg" },
  { text: "lr=1e-3, betas=(0.9, 0.999)", kind: "code", x: "70%", y: "84%", wide: true },
  { text: "§2 · p.2", kind: "code", x: "30%", y: "5%", size: "sm" },
  { text: "model.train()", kind: "code", x: "29%", y: "94%", size: "sm" },
];

export function FloatingFragments() {
  const [lit, setLit] = React.useState(1);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setLit((prev) => {
        let next = prev;
        while (next === prev) next = Math.floor(Math.random() * FRAGMENTS.length);
        return next;
      });
    }, 1700);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block" aria-hidden="true">
      {FRAGMENTS.map((f, i) => (
        <span
          key={i}
          className={cn("fragment absolute whitespace-nowrap", f.wide && "hidden lg:block")}
          style={{ left: f.x, top: f.y, "--i": i, "--d": `${8 + (i % 4) * 1.5}s` } as React.CSSProperties}
        >
          <span
            className={cn(
              "drift inline-block rounded-[2px] px-1.5 py-0.5 transition-colors duration-700",
              f.kind === "math" ? "font-serif italic" : "font-mono",
              f.size === "lg" ? "text-[22px]" : f.size === "sm" ? "text-[11px]" : "text-[13px]",
              lit === i ? "bg-[hsl(var(--highlight))] text-[#111]" : "text-muted-foreground/55",
            )}
            style={f.kind === "math" ? { fontFamily: "'Times New Roman', Times, serif" } : undefined}
          >
            {f.text}
          </span>
        </span>
      ))}
    </div>
  );
}
