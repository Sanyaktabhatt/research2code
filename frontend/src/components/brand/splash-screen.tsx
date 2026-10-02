import { BrandMark } from "@/components/brand/brand-mark";
import { Wordmark, Tagline } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils/cn";

interface SplashScreenProps {
  className?: string;
}

/**
 * Full-viewport branded loading moment - used for top-level route suspense
 * (app/loading.tsx) instead of a bare spinner, so a cold load still reads as
 * "Research2Code" rather than a blank flash.
 */
export function SplashScreen({ className }: SplashScreenProps) {
  return (
    <div className={cn("flex min-h-svh flex-col items-center justify-center gap-5 bg-background", className)}>
      <div role="status" aria-label="Loading Research2Code" className="flex flex-col items-center gap-3">
        <BrandMark size={36} interactive={false} />
        <div className="flex flex-col items-center gap-1">
          <Wordmark size="lg" />
          <Tagline />
        </div>
      </div>
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-border" aria-hidden="true">
        <div className="h-full w-1/3 animate-[splash-progress_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
    </div>
  );
}
