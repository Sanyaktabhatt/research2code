"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecentProjectsSuspense } from "@/features/dashboard/api/use-dashboard-data";
import { cn } from "@/lib/utils/cn";

/** Renders its children only once the account has at least one project. */
export function WhenHasProjects({ children }: { children: React.ReactNode }) {
  const { data: projects } = useRecentProjectsSuspense();
  return projects.total > 0 ? <>{children}</> : null;
}

/** Renders its children only while the account has no projects. */
export function WhenNoProjects({ children }: { children: React.ReactNode }) {
  const { data: projects } = useRecentProjectsSuspense();
  return projects.total === 0 ? <>{children}</> : null;
}

const STEPS = [
  { title: "Create a project", body: "Name it and drop in the paper's PDF." },
  { title: "Let it read the paper", body: "Parsing and indexing start on their own." },
  { title: "Extract, generate, run", body: "Review the methodology, generate the code, start a tracked run." },
];

/** What a finished pipeline looks like, replayed as a loop. Illustrative only. */
const PREVIEW = [
  { label: "Parsed", detail: "adam_2015.pdf · sections, figures, Algorithm 1" },
  { label: "Indexed", detail: "ready for cited answers in the AI Assistant" },
  { label: "Extracted", detail: "optimizer, datasets, CNN, defaults α β₁ β₂ ε" },
  { label: "Generated", detail: "adam-cifar10/ · optim/adam.py, model.py, train.py" },
  { label: "Running", detail: "docker · mlflow run · epoch 3" },
];

function PipelinePreview() {
  // `step` = how many rows have completed; the row at index `step` is in progress.
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(PREVIEW.length - 1);
      return;
    }
    const id = window.setInterval(() => setStep((s) => (s >= PREVIEW.length + 2 ? 0 : s + 1)), 1100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="border border-border bg-muted/40 font-mono text-[12.5px]">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-[11px] text-muted-foreground">
        <span>pipeline · preview</span>
        <span>illustrative</span>
      </div>
      <ol className="space-y-0 px-4 py-3">
        {PREVIEW.map((row, i) => {
          const isLast = i === PREVIEW.length - 1;
          const done = i < step && !isLast;
          const current = i === Math.min(step, PREVIEW.length - 1) && (isLast ? step >= i : true);
          const visible = i <= step;
          return (
            <li
              key={row.label}
              className={cn(
                "flex items-start gap-3 py-1.5 transition-all duration-500",
                visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
              )}
            >
              <span className="mt-[3px] flex size-3.5 shrink-0 items-center justify-center">
                {done ? (
                  <Check className="size-3.5 text-foreground" strokeWidth={2.5} aria-hidden="true" />
                ) : current ? (
                  <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
                ) : null}
              </span>
              <span className="w-[5.5rem] shrink-0 text-foreground">{row.label}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.detail}</span>
            </li>
          );
        })}
      </ol>
      <div className="h-0.5 bg-border">
        <div
          className="h-full bg-foreground transition-[width] duration-700 ease-out"
          style={{ width: `${(Math.min(step, PREVIEW.length) / PREVIEW.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** First-run hero: shown instead of a wall of zeroes while the account has no projects. */
export function GettingStarted() {
  return (
    <section className="overflow-hidden border border-border bg-card" aria-labelledby="getting-started">
      <div className="grid gap-10 p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:p-12">
        <div className="flex flex-col">
          <p className="rise font-mono text-xs text-muted-foreground">No projects yet</p>
          <h2
            id="getting-started"
            className="rise mt-3 text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-[2.5rem]"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            Reproduce your first paper.
          </h2>
          <p className="rise mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground" style={{ "--i": 2 } as React.CSSProperties}>
            Upload a PDF and Research2Code reads it, pulls out the methodology, writes the PyTorch project and runs it for
            you. Every step stays open to inspect.
          </p>

          <ol className="mt-8 border-t border-border">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="rise flex gap-4 border-b border-border py-3.5"
                style={{ "--i": i + 3 } as React.CSSProperties}
              >
                <span className="pt-0.5 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="text-[15px] font-medium text-foreground">{step.title}</p>
                  <p className="text-[13px] text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="rise mt-8 flex flex-wrap gap-3" style={{ "--i": 6 } as React.CSSProperties}>
            <Button asChild size="lg" className="group">
              <Link href="/projects/new">
                Create your first project
                <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/graph">Explore a graph</Link>
            </Button>
          </div>
        </div>

        <div className="rise self-center" style={{ "--i": 3 } as React.CSSProperties}>
          <PipelinePreview />
        </div>
      </div>
    </section>
  );
}
