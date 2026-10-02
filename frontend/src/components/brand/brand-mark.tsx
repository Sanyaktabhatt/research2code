import { cn } from "@/lib/utils/cn";

export type BrandVariant = "auto" | "onLight" | "onDark";

interface BrandMarkProps {
  /** Pixel size of the square symbol. */
  size?: number;
  /**
   * "auto" follows the app theme (navy tile on light surfaces, white tile on
   * dark); "onLight"/"onDark" pin the colors for a known background.
   */
  variant?: BrandVariant;
  className?: string;
  /** Retained for API compatibility - the mark never animates. */
  interactive?: boolean;
}

/** The single brand orange, fixed across themes so the accent reads identically everywhere. */
export const BRAND_ORANGE = "hsl(21 90% 50%)";

const VARIANT_CLASSES: Record<BrandVariant, string> = {
  auto: "[--r2c-tile:hsl(218_44%_16%)] [--r2c-bar:#fff] dark:[--r2c-tile:#fff] dark:[--r2c-bar:hsl(218_44%_16%)]",
  onLight: "[--r2c-tile:hsl(218_44%_16%)] [--r2c-bar:#fff]",
  onDark: "[--r2c-tile:#fff] [--r2c-bar:hsl(218_44%_16%)]",
};

/**
 * Research2Code symbol: a pipe-forward operator `|>` on a rounded tile. The
 * bar is the paper, the orange chevron is code being run - read together it
 * is the pipeline operator, "paper piped into an experiment". Two strokes on
 * a 32-unit grid, sized so it stays crisp at 16px. Exported as standalone
 * SVGs in public/brand/ and as the favicon (app/icon.svg).
 */
export function BrandMark({ size = 28, variant = "auto", className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-hidden="true"
      className={cn("shrink-0", VARIANT_CLASSES[variant], className)}
    >
      <rect width="32" height="32" rx="8" fill="var(--r2c-tile)" />
      <rect x="7.5" y="8.5" width="4.2" height="15" rx="2.1" fill="var(--r2c-bar)" />
      <path d="M15.7 9.3 22.5 16l-6.8 6.7" stroke={BRAND_ORANGE} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
