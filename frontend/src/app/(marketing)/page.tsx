import Link from "next/link";
import { ArrowRight, Bot, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Turn research papers into runnable ML projects
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
        Upload a paper. Research2Code extracts the method, builds a knowledge graph, and
        generates a reproducible, trainable codebase — with execution tracking built in.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
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

      <div className="mt-20 grid gap-6 text-left sm:grid-cols-3">
        <Feature icon={Sparkles} title="Knowledge extraction" description="LLM-driven parsing turns papers into structured, queryable knowledge." />
        <Feature icon={Share2} title="Knowledge graph" description="Explore extracted entities and relations visually before generating code." />
        <Feature icon={Bot} title="Multi-agent codegen" description="Agents plan, write, and review a runnable project from the extracted method." />
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, description }: { icon: typeof Sparkles; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border p-5">
      <Icon className="size-5 text-primary" />
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
