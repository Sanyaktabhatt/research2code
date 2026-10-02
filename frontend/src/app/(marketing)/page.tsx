import Link from "next/link";
import { ArrowRight, Bot, FileText, FlaskConical, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const PIPELINE = [
  { icon: FileText, label: "Paper", detail: "PDF upload & parsing" },
  { icon: Sparkles, label: "Knowledge", detail: "Structured extraction" },
  { icon: Share2, label: "Graph", detail: "Entities & relations" },
  { icon: Bot, label: "Codegen", detail: "Multi-agent project" },
  { icon: FlaskConical, label: "Runs", detail: "Execution tracking" },
];

export default function LandingPage() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="section-label text-primary">ML research platform</p>
            <h1 className="mt-3 text-3xl font-semibold leading-[1.15] tracking-tight sm:text-[2.625rem]">
              Turn research papers into runnable ML projects
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Upload a paper. Research2Code extracts the method, builds a knowledge graph, and
              generates a reproducible, trainable codebase — with execution tracking built in.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Get started
                  <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background shadow-sm" aria-hidden="true">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="section-label">Pipeline</span>
              <span className="font-mono text-[11px] text-muted-foreground">paper → project</span>
            </div>
            <ol className="divide-y divide-border">
              {PIPELINE.map((step, index) => (
                <li key={step.label} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-5 font-mono text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <span className="flex size-7 items-center justify-center rounded-md border border-border bg-card text-foreground/70">
                    <step.icon className="size-3.5" />
                  </span>
                  <span className="text-sm font-medium">{step.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{step.detail}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Feature icon={Sparkles} title="Knowledge extraction" description="LLM-driven parsing turns papers into structured, queryable knowledge." />
          <Feature icon={Share2} title="Knowledge graph" description="Explore extracted entities and relations visually before generating code." />
          <Feature icon={Bot} title="Multi-agent codegen" description="Agents plan, write, and review a runnable project from the extracted method." />
        </div>
      </section>
    </>
  );
}

function Feature({ icon: Icon, title, description }: { icon: typeof Sparkles; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
      <div className="flex size-8 items-center justify-center rounded-md border border-primary/20 bg-primary/[0.08] text-primary">
        <Icon className="size-4" />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
