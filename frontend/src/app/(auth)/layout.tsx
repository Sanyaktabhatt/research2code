import Link from "next/link";
import { Logo } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { FloatingFragments } from "@/features/auth/components/floating-fragments";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <FloatingFragments />

      <header className="relative z-10 flex justify-end px-5 py-5 sm:px-8">
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-10">
        <Link
          href="/"
          className="rise mb-8 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Research2Code home"
        >
          <Logo size="lg" />
        </Link>
        <div style={{ "--i": 1 } as React.CSSProperties} className="rise w-full max-w-[400px] border border-border bg-card/95 p-7 shadow-lg backdrop-blur-sm sm:p-9">{children}</div>
      </main>

      <footer className="relative z-10 px-5 pb-6 text-center font-mono text-[11px] text-muted-foreground sm:px-8">
        From research papers to reproducible experiments.
      </footer>
    </div>
  );
}
