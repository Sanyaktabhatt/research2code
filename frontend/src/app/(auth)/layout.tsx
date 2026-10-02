import Link from "next/link";
import { FileText, FlaskConical, FolderCode, Network } from "lucide-react";
import { Logo } from "@/components/brand/wordmark";

const PIPELINE = [
  { icon: FileText, label: "Parse the paper" },
  { icon: Network, label: "Extract the methodology" },
  { icon: FolderCode, label: "Generate the project" },
  { icon: FlaskConical, label: "Run and track the experiment" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand panel - desktop only; phones get the compact logo above the form. */}
      <aside className="hidden flex-col justify-between border-r border-border bg-card px-12 py-10 lg:flex">
        <Link href="/" className="w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Research2Code home">
          <Logo size="md" />
        </Link>

        <div className="max-w-md">
          <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em]">
            From research papers to reproducible experiments.
          </h2>
          <ol className="mt-8 space-y-3.5">
            {PIPELINE.map((step, index) => (
              <li key={step.label} className="flex items-center gap-3 text-[15px] text-foreground/85">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                {step.label}
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-muted-foreground">© Research2Code</p>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <Link
          href="/"
          className="w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          aria-label="Research2Code home"
        >
          <Logo size="md" />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
