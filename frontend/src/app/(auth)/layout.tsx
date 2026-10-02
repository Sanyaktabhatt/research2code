import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { Wordmark, Tagline } from "@/components/brand/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="h-1 w-full bg-primary" aria-hidden="true" />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
        <Link href="/" className="flex flex-col items-center gap-3 rounded-md">
          <BrandMark size={40} />
          <div className="flex flex-col items-center gap-1">
            <Wordmark size="lg" />
            <Tagline />
          </div>
        </Link>
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-md sm:p-7">{children}</div>
      </div>
    </div>
  );
}
