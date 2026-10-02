import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PipelinePreview } from "@/features/marketing/components/pipeline-preview";

const STEPS = [
  { title: "Upload a paper", description: "Add a PDF to a project. Sections, figures, tables, and equations are parsed automatically." },
  { title: "Extract the methodology", description: "Datasets, architecture, hyperparameters, metrics, and results are extracted with confidence scores." },
  { title: "Generate the project", description: "A versioned PyTorch codebase is authored from the extraction, with a quality report and diffs." },
  { title: "Run the experiment", description: "Execute in an isolated Docker container with live logs and MLflow / TensorBoard tracking." },
];

/** One row per real workspace tab (see config/nav.ts) - what the user can actually open and inspect. */
const WORKSPACE_TABS = [
  { tab: "Paper", detail: "Page-by-page PDF viewer with a section, figure, table, and equation outline, plus in-document search." },
  { tab: "Knowledge", detail: "Datasets, architecture, hyperparameters, metrics, results, and limitations - each with a confidence score." },
  { tab: "Knowledge Graph", detail: "Typed entities and relationships from each extraction, versioned per run and explorable across projects." },
  { tab: "AI Assistant", detail: "Retrieval-augmented chat over the paper; every claim cites and links to its source page." },
  { tab: "Generated Project", detail: "File tree and code viewer, validator-flagged issues, version-to-version diffs, and ZIP download." },
  { tab: "Experiments", detail: "Run history with live logs, resource usage, metrics, MLflow and TensorBoard links, and run comparison." },
  { tab: "Artifacts", detail: "Every file the pipeline produced - exports, checkpoints, logs - in one searchable browser." },
];

export default function LandingPage() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-24">
          <div>
            <p className="section-label text-primary">Research-to-code workspace</p>
            <h1 className="mt-4 text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.025em] text-foreground sm:text-5xl">
              From Research Papers to Reproducible Experiments.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed">
              Turn machine-learning research into structured methodologies, generated code, and executable experiments — all in
              one workspace.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="text-[15px]">
                <Link href="/signup">
                  Get Started
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-[15px]">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>

          <PipelinePreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="how-it-works">
        <div className="max-w-2xl">
          <p className="section-label">How it works</p>
          <h2 id="how-it-works" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            One pipeline, from PDF to a tracked training run.
          </h2>
        </div>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="bg-card p-5">
              <span className="font-mono text-xs font-medium text-primary">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-[15px] font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-card" aria-labelledby="workspace">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="section-label">Workspace</p>
            <h2 id="workspace" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Every intermediate step stays inspectable.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Each project opens into a workspace with one tab per pipeline stage, so you can check what was extracted and
              generated before you run anything.
            </p>
          </div>

          <dl className="border-t border-border">
            {WORKSPACE_TABS.map((item, index) => (
              <div key={item.tab} className="grid gap-1 border-b border-border py-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
                <dt className="flex items-baseline gap-3 text-[15px] font-semibold text-foreground">
                  <span className="w-5 font-mono text-xs font-medium tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.tab}
                </dt>
                <dd className="pl-8 text-[15px] leading-relaxed text-muted-foreground sm:pl-0">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Start with a paper you want to reproduce.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create an account, add a project, and upload the PDF.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="text-[15px]">
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button asChild variant="outline" className="text-[15px]">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
