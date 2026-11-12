import type * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Reveal } from "@/components/ui/reveal";
import { PaperToCode } from "@/features/marketing/components/paper-to-code";
import { AssistantSpecimen, ExtractionSpecimen, ProjectSpecimen, RunSpecimen } from "@/features/marketing/components/specimens";

/** Each pipeline stage, what goes in, what comes out, and where you can inspect it. */
const STAGES = [
  { stage: "Parse", input: "Paper PDF", output: "Sections, figures, tables, equations", where: "Paper" },
  { stage: "Extract", input: "Parsed paper", output: "Datasets, architecture, hyperparameters, metrics, results — each with a confidence score", where: "Knowledge, Knowledge Graph" },
  { stage: "Ask", input: "Parsed paper", output: "Cited answers that link back to the source page", where: "AI Assistant" },
  { stage: "Generate", input: "Extraction", output: "Versioned PyTorch project, validator report, diffs, ZIP", where: "Generated Project" },
  { stage: "Run", input: "Generated project", output: "Docker run with live logs, MLflow and TensorBoard tracking", where: "Experiments" },
];

const FEATURES = [
  {
    tab: "Knowledge",
    title: "The methodology, pulled out and scored.",
    body: "Task, datasets, architecture, hyperparameters, training schedule, metrics, reported results, ablations and limitations are extracted into structured fields. Each one carries a confidence score, so you know what to double-check before generating code. The same extraction is also built into a typed knowledge graph you can explore.",
    specimen: <ExtractionSpecimen />,
  },
  {
    tab: "AI Assistant",
    title: "Ask the paper, get answers with page numbers.",
    body: "Chat over the paper with hybrid vector and full-text retrieval. Answers stream token by token, and every claim cites the section and page it came from, so you can jump straight to the source.",
    specimen: <AssistantSpecimen />,
  },
  {
    tab: "Generated Project",
    title: "A project you can read, diff and download.",
    body: "An LLM writes the paper-specific parts: model, dataset, loss and metrics. The rest comes from tested templates: training loop, config, Dockerfile, checkpointing, AMP and DDP, MLflow and TensorBoard hooks. Each generation is validated, versioned and packaged as a ZIP.",
    specimen: <ProjectSpecimen />,
  },
  {
    tab: "Experiments",
    title: "Run it in isolation and watch it train.",
    body: "Each run executes train.py in its own Docker container. Logs and CPU, GPU and memory usage stream back live, while metrics, parameters and checkpoints are tracked in MLflow and TensorBoard. Compare runs side by side.",
    specimen: <RunSpecimen />,
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-16">
            <h1 className="rise text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.04em] text-foreground sm:text-[4rem]">
              From the equations in a paper to code you can run.
            </h1>
            <div className="rise lg:pb-2" style={{ "--i": 1 } as React.CSSProperties}>
              <p className="text-base leading-relaxed text-muted-foreground">
                Research2Code parses an ML paper, extracts its methodology, writes the PyTorch project, and runs it in Docker.
                Every step stays open for you to inspect.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-none text-[15px]">
                  <Link href="/signup">Create an account</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-none text-[15px]">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="rise mt-12 sm:mt-16" style={{ "--i": 2 } as React.CSSProperties}>
            <PaperToCode />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="pipeline">
        <Reveal>
          <h2 id="pipeline" className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
            What each stage takes in and produces.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-t border-foreground text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="w-28 py-2.5 pr-4 font-medium">Stage</th>
                  <th className="w-44 py-2.5 pr-4 font-medium">Input</th>
                  <th className="py-2.5 pr-4 font-medium">Output</th>
                  <th className="w-52 py-2.5 font-medium">Inspect in</th>
                </tr>
              </thead>
              <tbody>
                {STAGES.map((row) => (
                  <tr key={row.stage} className="border-b border-border align-top transition-colors hover:bg-accent/60">
                    <td className="py-3.5 pr-4 text-[15px] font-semibold">{row.stage}</td>
                    <td className="py-3.5 pr-4 text-muted-foreground">{row.input}</td>
                    <td className="py-3.5 pr-4 text-foreground/90">{row.output}</td>
                    <td className="py-3.5 font-mono text-xs text-muted-foreground">{row.where}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      <section className="border-t border-border" aria-label="Workspace">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.tab}
              className={cn(
                "grid gap-8 border-b border-border py-16 last:border-0 sm:py-20 lg:gap-16",
                index % 2 === 1 ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]" : "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]",
              )}
            >
              <Reveal className={index % 2 === 1 ? "lg:order-2" : undefined}>
                <p className="font-mono text-xs text-muted-foreground">{feature.tab} tab</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{feature.title}</h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{feature.body}</p>
              </Reveal>
              <Reveal delay={0.1} className={index % 2 === 1 ? "lg:order-1" : undefined}>
                {feature.specimen}
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-20 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Start with a paper you want to reproduce.</h2>
            <p className="mt-2 text-[15px] text-muted-foreground">Create an account, add a project and upload the PDF.</p>
          </div>
          <Button asChild size="lg" className="rounded-none text-[15px]">
            <Link href="/signup">Create an account</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
