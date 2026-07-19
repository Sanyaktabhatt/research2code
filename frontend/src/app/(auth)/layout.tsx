import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { Wordmark, Tagline } from "@/components/brand/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden bg-spotlight bg-muted/20 px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
        style={{ backgroundImage: "radial-gradient(hsl(var(--border-strong)) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 size-72 -translate-x-1/2 rounded-full bg-gradient-brand opacity-25 blur-3xl animate-float-slow"
        aria-hidden="true"
      />
      <Link href="/" className="relative flex flex-col items-center gap-3">
        <BrandMark size={44} />
        <div className="flex flex-col items-center gap-1">
          <Wordmark size="lg" />
          <Tagline />
        </div>
      </Link>
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background/90 p-6 shadow-xl backdrop-blur-xl">{children}</div>
    </div>
  );
}
