import { cn } from "@/lib/utils/cn";

interface WordmarkProps {
  className?: string;
  /** Text size - "sm" for chrome (sidebar/topbar), "lg" for hero placements (auth, splash). */
  size?: "sm" | "lg";
}

/**
 * "Research" in the surrounding text color, "2Code" in the primary accent -
 * the two-tone treatment used everywhere the product name appears as text.
 * The first half inherits `currentColor` so the wordmark works on both the
 * light canvas and the dark navigation rail.
 */
export function Wordmark({ className, size = "sm" }: WordmarkProps) {
  return (
    <span
      className={cn(
        "font-semibold tracking-tight text-foreground",
        size === "sm" ? "text-[14px]" : "text-2xl",
        className,
      )}
    >
      Research<span className="text-primary">2Code</span>
    </span>
  );
}

interface TaglineProps {
  className?: string;
}

export function Tagline({ className }: TaglineProps) {
  return <p className={cn("text-xs font-medium text-muted-foreground", className)}>From papers to production.</p>;
}
