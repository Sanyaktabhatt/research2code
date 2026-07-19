import { cn } from "@/lib/utils/cn";

interface WordmarkProps {
  className?: string;
  /** Text size - "sm" for chrome (sidebar/topbar), "lg" for hero placements (auth, splash). */
  size?: "sm" | "lg";
}

/** "Research" in neutral foreground, "Code" in the brand gradient - the two-tone treatment used everywhere the product name appears as text. */
export function Wordmark({ className, size = "sm" }: WordmarkProps) {
  return (
    <span
      className={cn(
        "font-semibold tracking-tight text-foreground",
        size === "sm" ? "text-[13px]" : "text-2xl",
        className,
      )}
    >
      Research<span className="text-gradient-brand">2Code</span>
    </span>
  );
}

interface TaglineProps {
  className?: string;
}

export function Tagline({ className }: TaglineProps) {
  return <p className={cn("text-xs font-medium tracking-wide text-muted-foreground", className)}>From papers to production.</p>;
}
