import Link from "next/link";
import { APP_NAME } from "@/config/constants";
import { BrandMark } from "@/components/brand/brand-mark";
import { Wordmark } from "@/components/brand/wordmark";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label={APP_NAME}>
            <BrandMark size={26} />
            <Wordmark className="text-[15px] text-white" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="rounded-sm px-2 py-1 text-sm font-medium text-sidebar-foreground transition-colors hover:text-white">
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-8 items-center rounded-md border border-primary bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:border-primary-hover hover:bg-primary-hover"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 text-xs text-muted-foreground sm:px-6">
          © {APP_NAME}
        </div>
      </footer>
    </div>
  );
}
