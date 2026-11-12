import type * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Static, illustrative product specimens for the landing page - each mirrors
 * a real workspace tab using the Attention paper as the running example.
 */

function Frame({ title, meta, dark = false, children }: { title: string; meta?: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("border border-foreground", dark ? "bg-[#111] text-[#e6e6e6]" : "bg-card")}>
      <div
        className={cn(
          "flex items-center justify-between border-b px-4 py-2.5 font-mono text-[11px]",
          dark ? "border-white/10 text-[#8a8a8a]" : "border-border text-muted-foreground",
        )}
      >
        <span>{title}</span>
        {meta && <span>{meta}</span>}
      </div>
      {children}
    </div>
  );
}

const EXTRACTED = [
  { field: "Task", value: "Machine translation", confidence: 0.98 },
  { field: "Dataset", value: "WMT 2014 English–German", confidence: 0.96 },
  { field: "Architecture", value: "Encoder–decoder, 6 + 6 layers, 8 heads", confidence: 0.93 },
  { field: "d_model", value: "512", confidence: 0.97 },
  { field: "Optimizer", value: "Adam, β₁ = 0.9, β₂ = 0.98", confidence: 0.91 },
  { field: "LR schedule", value: "Linear warmup, 4000 steps, then inverse sqrt", confidence: 0.84 },
  { field: "Regularization", value: "Dropout 0.1, label smoothing 0.1", confidence: 0.88 },
];

export function ExtractionSpecimen() {
  return (
    <Frame title="knowledge / extraction v1" meta="excerpt">
      <table className="w-full text-left text-[13px]">
        <tbody>
          {EXTRACTED.map((row, i) => (
            <tr key={row.field} className="border-b border-border last:border-0">
              <td className="w-32 py-2.5 pl-4 pr-3 align-top text-muted-foreground">{row.field}</td>
              <td className="py-2.5 pr-3 align-top font-medium">{row.value}</td>
              <td className="w-28 py-2.5 pr-4 align-top">
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 bg-muted">
                    <div
                      className="grow-x h-full origin-left bg-foreground"
                      style={{ width: `${row.confidence * 100}%`, "--i": i } as React.CSSProperties}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                    {row.confidence.toFixed(2)}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Frame>
  );
}

function Cite({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-block cursor-default border border-foreground px-1 align-[1px] font-mono text-[10.5px] leading-4 transition-colors hover:bg-[hsl(var(--highlight))]">
      {children}
    </span>
  );
}

export function AssistantSpecimen() {
  return (
    <Frame title="ai assistant" meta="grounded in this paper">
      <div className="space-y-5 p-5 text-[14px] leading-relaxed">
        <p className="ml-auto w-fit max-w-[85%] bg-muted px-3.5 py-2.5">Why do they scale the dot products by √d_k?</p>
        <div className="max-w-[92%] space-y-2.5">
          <p>
            For large d_k the dot products grow large in magnitude, pushing the softmax into regions with extremely small
            gradients. Dividing by √d_k counteracts this
            <Cite>§3.2.1 · p.4</Cite>.
          </p>
          <p>
            The authors note that additive attention outperforms unscaled dot-product attention for larger d_k, which
            motivated the scaling factor
            <Cite>§3.2.1 · p.4</Cite>
            <Cite>fn. 4 · p.4</Cite>.
          </p>
        </div>
        <p className="border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
          Each citation opens the paper at the cited page.
        </p>
      </div>
    </Frame>
  );
}

const TREE: Array<{ path: string; depth: number; source?: "paper" | "template" }> = [
  { path: "transformer-wmt14/", depth: 0 },
  { path: "model.py", depth: 1, source: "paper" },
  { path: "dataset.py", depth: 1, source: "paper" },
  { path: "loss.py", depth: 1, source: "paper" },
  { path: "metrics.py", depth: 1, source: "paper" },
  { path: "train.py", depth: 1, source: "template" },
  { path: "config.yaml", depth: 1, source: "template" },
  { path: "Dockerfile", depth: 1, source: "template" },
  { path: "tests/", depth: 1, source: "template" },
  { path: "README.md", depth: 1, source: "template" },
];

export function ProjectSpecimen() {
  return (
    <Frame title="generated project" meta="v2 · diff vs v1 available">
      <ul className="py-3 font-mono text-[12.5px] leading-7">
        {TREE.map((item) => (
          <li key={item.path} className="flex items-center justify-between px-4 hover:bg-muted" style={{ paddingLeft: `${16 + item.depth * 20}px` }}>
            <span className={item.depth === 0 ? "font-semibold" : undefined}>{item.path}</span>
            {item.source && (
              <span
                className={cn(
                  "text-[10.5px]",
                  item.source === "paper" ? "bg-[hsl(var(--highlight))] px-1.5 text-foreground" : "text-muted-foreground",
                )}
              >
                {item.source === "paper" ? "written from the paper" : "template"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Frame>
  );
}

const LOG = [
  "$ python train.py --config config.yaml",
  "mlflow  run 7f3a2c started · experiment transformer-wmt14",
  "data    WMT14 en-de · vocab 37000 (shared BPE)",
  "model   transformer-base · 65.0M params",
  "step   1000  loss 4.812  lr 1.75e-04",
  "step   2000  loss 3.906  lr 3.49e-04",
  "step   3000  loss 3.311  lr 5.24e-04",
  "step   4000  loss 2.987  lr 6.99e-04",
  "ckpt    saved checkpoints/step_4000.pt",
];

export function RunSpecimen() {
  return (
    <Frame title="experiments / run v1" meta="docker · gpu" dark>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-[1.85]">
        {LOG.map((line, i) => (
          <div key={i} className="log-line" style={{ "--i": i } as React.CSSProperties}>
            {line.startsWith("$") ? (
              <>
                <span className="text-[hsl(var(--highlight))]">$</span>
                {line.slice(1)}
              </>
            ) : (
              <span className={line.startsWith("step") ? "text-[#e6e6e6]" : "text-[#8a8a8a]"}>{line}</span>
            )}
          </div>
        ))}
      </pre>
      <div className="flex gap-4 border-t border-white/10 px-4 py-2.5 font-mono text-[11px] text-[#8a8a8a]">
        <span className="underline underline-offset-2">Open in MLflow</span>
        <span className="underline underline-offset-2">Open TensorBoard</span>
        <span className="ml-auto">CPU · GPU · memory streamed live</span>
      </div>
    </Frame>
  );
}
