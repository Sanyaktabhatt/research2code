import Link from "next/link";
import { APP_NAME } from "@/config/constants";
import { Logo } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${APP_NAME} home`}>
            <Logo size="sm" className="sm:hidden" />
            <Logo size="md" className="hidden sm:inline-flex" />
          </Link>
          <nav aria-label="Account" className="flex items-center gap-1.5 sm:gap-2">
            <Button asChild variant="ghost" className="h-8 px-2.5 sm:h-9 sm:px-4 sm:text-[15px]">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="h-8 px-3 sm:h-9 sm:px-4 sm:text-[15px]">
              <Link href="/signup">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-4 py-6 sm:flex-row sm:items-center sm:px-6">
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">© {APP_NAME}. From research papers to reproducible experiments.</p>
        </div>
      </footer>
    </div>
  );
}
