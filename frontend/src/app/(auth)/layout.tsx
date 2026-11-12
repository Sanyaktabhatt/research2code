import Link from "next/link";
import { Logo } from "@/components/brand/wordmark";
import { EquationPanel } from "@/features/auth/components/equation-panel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel - desktop only; phones get the compact logo above the form. */}
      <aside className="hidden flex-col justify-between bg-[#111] px-12 py-10 lg:flex xl:px-16">
        <Link href="/" className="w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Research2Code home">
          <Logo size="md" variant="onDark" />
        </Link>
        <EquationPanel />
        <p className="font-mono text-[11px] text-white/40">From research papers to reproducible experiments.</p>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <Link href="/" className="w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden" aria-label="Research2Code home">
          <Logo size="md" />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="rise w-full max-w-[380px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
