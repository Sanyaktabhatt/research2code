"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Landing-page specimen: a passage from "Attention Is All You Need" beside the
 * PyTorch it becomes. Each term of Eq. (1) is paired with the line that
 * implements it; the pairs cycle on their own and follow the pointer on hover.
 * Static markup, captioned as illustrative.
 */

type Term = 0 | 1 | 2 | 3;

const CODE: Array<{ text: React.ReactNode; term?: Term }> = [
  { text: <><K>import</K> math</> },
  { text: "" },
  { text: <><K>def</K> <F>scaled_dot_product_attention</F>(q, k, v, mask=<K>None</K>):</> },
  { text: <>{"    "}<C>{'"""Eq. (1) — Vaswani et al., 2017, §3.2.1"""'}</C></> },
  { text: <>{"    "}d_k = q.size(-1)</> },
  { text: <>{"    "}scores = q @ k.transpose(-2, -1)</>, term: 0 },
  { text: <>{"    "}scores = scores / math.sqrt(d_k)</>, term: 1 },
  { text: <>{"    "}<K>if</K> mask <K>is not None</K>:</> },
  { text: <>{"        "}scores = scores.masked_fill(mask == 0, <F>float</F>(<C>&quot;-inf&quot;</C>))</> },
  { text: <>{"    "}weights = scores.softmax(dim=-1)</>, term: 2 },
  { text: <>{"    "}<K>return</K> weights @ v</>, term: 3 },
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
  const [active, setActive] = React.useState<Term>(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((t) => (((t + 1) % 4) as Term)), 2200);
    return () => window.clearInterval(id);
  }, [paused]);

  const term = (t: Term, children: React.ReactNode, extra?: string) => (
    <span
      onMouseEnter={() => {
        setPaused(true);
        setActive(t);
      }}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        "cursor-default rounded-[2px] px-[1px] transition-colors duration-300",
        active === t ? "bg-[hsl(var(--highlight))]" : "bg-transparent",
        extra,
      )}
    >
      {children}
    </span>
  );

  return (
    <figure className={cn("w-full", className)}>
      <div className="grid overflow-hidden border border-foreground lg:grid-cols-2">
        {/* The paper */}
        <div className="bg-card px-6 py-7 sm:px-10 sm:py-10" style={{ fontFamily: "'Times New Roman', Times, 'Nimbus Roman', serif" }}>
          <div className="mb-6 flex items-baseline justify-between font-sans text-[11px] text-muted-foreground">
            <span className="font-mono">arXiv:1706.03762</span>
            <span className="font-mono">p. 4</span>
          </div>
          <h3 className="text-[19px] font-bold tracking-normal">3.2.1&nbsp;&nbsp;Scaled Dot-Product Attention</h3>
          <p className="mt-3 text-[17px] leading-[1.55] text-foreground/90">
            We call our particular attention &ldquo;Scaled Dot-Product Attention&rdquo;. The input consists of queries and keys
            of dimension <i>d</i><sub>k</sub>, and values of dimension <i>d</i><sub>v</sub>. We compute the dot products of the
            query with all keys, divide each by √<i>d</i><sub>k</sub>, and apply a softmax function to obtain the weights on the
            values.
          </p>

          <div className="my-7 flex items-center justify-center gap-6 text-[21px]">
            <span className="flex items-center gap-1.5">
              <span>Attention(<i>Q</i>, <i>K</i>, <i>V</i>) =</span>
              {term(2, <span>softmax</span>)}
              <span className="text-[26px] font-light leading-none">(</span>
              <span className="inline-flex flex-col items-center leading-tight">
                {term(0, <span><i>QK</i><sup className="text-[13px]">T</sup></span>, "border-b border-foreground pb-0.5")}
                {term(1, <span className="mt-0.5 inline-block">√<span className="border-t border-foreground"><i>d</i><sub className="text-[13px]">k</sub></span></span>)}
              </span>
              <span className="text-[26px] font-light leading-none">)</span>
              {term(3, <i>V</i>)}
            </span>
            <span className="text-[17px]">(1)</span>
          </div>
        </div>

        {/* The code */}
        <div className="border-t border-foreground bg-[#111] font-mono text-[12.5px] leading-[1.8] text-[#e6e6e6] lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[11px] text-[#8a8a8a]">
            <span>model/attention.py</span>
            <span>generated</span>
          </div>
          <pre className="overflow-x-auto py-4">
            {CODE.map((line, i) => {
              const on = line.term !== undefined && line.term === active;
              return (
                <div
                  key={i}
                  onMouseEnter={line.term !== undefined ? () => (setPaused(true), setActive(line.term!)) : undefined}
                  onMouseLeave={line.term !== undefined ? () => setPaused(false) : undefined}
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
        <span>Vaswani et al., &ldquo;Attention Is All You Need&rdquo; (2017), and the code it becomes. Hover a term.</span>
        <span>Illustrative example</span>
      </figcaption>
    </figure>
  );
}
