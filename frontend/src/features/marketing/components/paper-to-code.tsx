"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Landing-page specimen: Algorithm 1 from "Adam: A Method for Stochastic
 * Optimization" beside the PyTorch it becomes. Each update rule is paired
 * with the line that implements it; the pairs cycle on their own and follow
 * the pointer on hover. Static markup, captioned as illustrative.
 */

const STEPS = 5;

/** Algorithm 1's update rules, in the paper's notation. */
const RULES: Array<{ lhs: React.ReactNode; rhs: React.ReactNode }> = [
  {
    lhs: <>m<sub>t</sub></>,
    rhs: <>β<sub>1</sub> · m<sub>t−1</sub> + (1 − β<sub>1</sub>) · g<sub>t</sub></>,
  },
  {
    lhs: <>v<sub>t</sub></>,
    rhs: <>β<sub>2</sub> · v<sub>t−1</sub> + (1 − β<sub>2</sub>) · g<sub>t</sub><sup>2</sup></>,
  },
  {
    lhs: <>m̂<sub>t</sub></>,
    rhs: <>m<sub>t</sub> / (1 − β<sub>1</sub><sup>t</sup>)</>,
  },
  {
    lhs: <>v̂<sub>t</sub></>,
    rhs: <>v<sub>t</sub> / (1 − β<sub>2</sub><sup>t</sup>)</>,
  },
  {
    lhs: <>θ<sub>t</sub></>,
    rhs: <>θ<sub>t−1</sub> − α · m̂<sub>t</sub> / (√v̂<sub>t</sub> + ε)</>,
  },
];

const CODE: Array<{ text: React.ReactNode; step?: number }> = [
  { text: <><K>import</K> torch</> },
  { text: "" },
  { text: <><K>@</K>torch.no_grad()</> },
  { text: <><K>def</K> <F>adam_step</F>(p, state, lr=1e-3, b1=0.9, b2=0.999, eps=1e-8):</> },
  { text: <>{"    "}<C>{'"""Algorithm 1 — Kingma & Ba, 2015, p.2"""'}</C></> },
  { text: <>{"    "}g = p.grad</> },
  { text: <>{"    "}state.t += 1</> },
  { text: <>{"    "}state.m.mul_(b1).add_(g, alpha=1 - b1)</>, step: 0 },
  { text: <>{"    "}state.v.mul_(b2).addcmul_(g, g, value=1 - b2)</>, step: 1 },
  { text: <>{"    "}m_hat = state.m / (1 - b1 ** state.t)</>, step: 2 },
  { text: <>{"    "}v_hat = state.v / (1 - b2 ** state.t)</>, step: 3 },
  { text: <>{"    "}p.sub_(lr * m_hat / (v_hat.sqrt() + eps))</>, step: 4 },
];

function K({ children }: { children: React.ReactNode }) {
  return <span className="text-[#c8c8c8]">{children}</span>;
}
function F({ children }: { children: React.ReactNode }) {
  return <span className="text-white">{children}</span>;
}
function C({ children }: { children: React.ReactNode }) {
  return <span className="text-[#8a8a8a]">{children}</span>;
}

export function PaperToCode({ className }: { className?: string }) {
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((t) => (t + 1) % STEPS), 2000);
    return () => window.clearInterval(id);
  }, [paused]);

  const hover = (step: number) => ({
    onMouseEnter: () => {
      setPaused(true);
      setActive(step);
    },
    onMouseLeave: () => setPaused(false),
  });

  return (
    <figure className={cn("w-full", className)}>
      <div className="grid overflow-hidden border border-foreground lg:grid-cols-2">
        {/* The paper */}
        <div className="bg-card px-6 py-7 sm:px-10 sm:py-9" style={{ fontFamily: "'Times New Roman', Times, 'Nimbus Roman', serif" }}>
          <div className="mb-5 flex items-baseline justify-between font-sans text-[11px] text-muted-foreground">
            <span className="font-mono">arXiv:1412.6980</span>
            <span className="font-mono">p. 2</span>
          </div>
          <p className="text-[16px] leading-[1.5] text-foreground/90">
            <b>Algorithm 1:</b> <i>Adam</i>, our proposed algorithm for stochastic optimization. Good default settings for the
            tested machine learning problems are α = 0.001, β<sub>1</sub> = 0.9, β<sub>2</sub> = 0.999 and ε = 10<sup>−8</sup>.
          </p>

          <div className="mt-5 border-y border-foreground py-3 text-[16.5px] leading-[1.95]">
            <p className="text-foreground/70">
              <b className="text-foreground">while</b> θ<sub>t</sub> not converged <b className="text-foreground">do</b>
            </p>
            <p className="pl-5 text-foreground/70">
              t ← t + 1; &nbsp;g<sub>t</sub> ← ∇<sub>θ</sub>f<sub>t</sub>(θ<sub>t−1</sub>)
            </p>
            {RULES.map((rule, i) => (
              <p key={i} className="pl-5" {...hover(i)}>
                <span
                  className={cn(
                    "cursor-default rounded-[2px] px-1 transition-colors duration-300",
                    active === i ? "bg-[hsl(var(--highlight))] text-[#111]" : "bg-transparent",
                  )}
                >
                  <i>{rule.lhs}</i> ← <i>{rule.rhs}</i>
                </span>
              </p>
            ))}
            <p className="text-foreground/70">
              <b className="text-foreground">end while</b>
            </p>
          </div>
        </div>

        {/* The code */}
        <div className="border-t border-foreground bg-[#111] font-mono text-[12.5px] leading-[1.8] text-[#e6e6e6] lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[11px] text-[#8a8a8a]">
            <span>optim/adam.py</span>
            <span>generated</span>
          </div>
          <pre className="overflow-x-auto py-4">
            {CODE.map((line, i) => {
              const on = line.step !== undefined && line.step === active;
              return (
                <div
                  key={i}
                  {...(line.step !== undefined ? hover(line.step) : {})}
                  className={cn(
                    "flex border-l-2 pr-4 transition-colors duration-300",
                    on ? "border-[hsl(var(--highlight))] bg-white/[0.07]" : "border-transparent",
                  )}
                >
                  <span className="w-10 shrink-0 select-none pr-3 text-right text-[#5c5c5c]">{i + 1}</span>
                  <code className="whitespace-pre">{line.text}</code>
                </div>
              );
            })}
          </pre>
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>Kingma &amp; Ba, &ldquo;Adam: A Method for Stochastic Optimization&rdquo; (ICLR 2015), and the code it becomes. Hover a line.</span>
        <span>Illustrative example</span>
      </figcaption>
    </figure>
  );
}
