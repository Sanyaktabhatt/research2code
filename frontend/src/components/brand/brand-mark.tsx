import { cn } from "@/lib/utils/cn";

export type BrandVariant = "auto" | "onLight" | "onDark";

interface BrandMarkProps {
  /** Pixel size of the square symbol. */
  size?: number;
  /** "onDark" (and "auto" in dark mode) adds a hairline outline so the ink tile reads on black surfaces. */
  variant?: BrandVariant;
  className?: string;
  /** When true the cursor blinks continuously (splash, auth); otherwise only on hover of a parent `.group`. */
  interactive?: boolean;
}

/** Highlighter yellow - the brand's single accent. */
export const BRAND_ORANGE = "#FFE14A";

/** Paths are shared with the static SVGs in public/brand/ and app/icon.svg. */
export const MARK_PATHS = {
  tile: "M7 0H23L32 9V25A7 7 0 0 1 25 32H7A7 7 0 0 1 0 25V7A7 7 0 0 1 7 0Z",
  fold: "M23 0V6A3 3 0 0 0 26 9H32Z",
  chevron: "M8.5 12.5 13.5 17 8.5 21.5",
};

/**
 * Research2Code symbol: a page with its corner folded (the paper) holding a
 * terminal prompt and a highlighter-yellow cursor (the code it becomes).
 */
export function BrandMark({ size = 28, variant = "auto", className, interactive = false }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden="true" className={cn("shrink-0", className)}>
      <path d={MARK_PATHS.tile} fill="#111111" />
      <path
        d={MARK_PATHS.tile}
        className={variant === "onDark" ? undefined : variant === "auto" ? "hidden dark:block" : "hidden"}
        stroke="white"
        strokeOpacity="0.28"
      />
      <path d={MARK_PATHS.fold} fill="#5A5A5A" />
      <path d={MARK_PATHS.chevron} stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect
        x="16"
        y="19.6"
        width="8"
        height="2.8"
        rx="1.2"
        fill={BRAND_ORANGE}
        className={interactive ? "logo-cursor-on" : "logo-cursor"}
      />
    </svg>
  );
}
