import { BrandMark, BRAND_ORANGE, type BrandVariant } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils/cn";

const TEXT_TONE: Record<BrandVariant, string> = {
  auto: "text-foreground",
  onLight: "text-[hsl(218_44%_16%)]",
  onDark: "text-white",
};

interface WordmarkProps {
  className?: string;
  /** Text size - "sm" for chrome (navbar), "lg" for hero placements (auth, splash). */
  size?: "sm" | "lg";
  variant?: BrandVariant;
  /** Renders the "2" in the brand orange (default) - set false for single-color contexts. */
  accent?: boolean;
}

/** "Research2Code" set tight in the brand sans, with the numeral as the optional orange accent. */
export function Wordmark({ className, size = "sm", variant = "auto", accent = true }: WordmarkProps) {
  return (
    <span
      className={cn(
        "whitespace-nowrap font-semibold tracking-[-0.02em]",
        TEXT_TONE[variant],
        size === "sm" ? "text-[15px]" : "text-2xl",
        className,
      )}
    >
      Research
      <span style={accent ? { color: BRAND_ORANGE } : undefined}>2</span>
      Code
    </span>
  );
}

interface LogoProps {
  className?: string;
  variant?: BrandVariant;
  /** Symbol size in px; the wordmark scales with it. */
  size?: "sm" | "md" | "lg";
  /** Hides the wordmark below the `sm` breakpoint, leaving the compact symbol. */
  collapseOnMobile?: boolean;
}

const LOGO_SIZES = {
  sm: { mark: 24, text: "text-[15px]", gap: "gap-2" },
  md: { mark: 30, text: "text-[18px]", gap: "gap-2.5" },
  lg: { mark: 40, text: "text-[24px]", gap: "gap-3" },
} as const;

/** Horizontal lockup: symbol + wordmark, baseline-centered. */
export function Logo({ className, variant = "auto", size = "md", collapseOnMobile = false }: LogoProps) {
  const dims = LOGO_SIZES[size];
  return (
    <span className={cn("inline-flex items-center", dims.gap, className)}>
      <BrandMark size={dims.mark} variant={variant} />
      <Wordmark variant={variant} className={cn(dims.text, collapseOnMobile && "hidden sm:inline")} />
    </span>
  );
}

interface TaglineProps {
  className?: string;
}

export function Tagline({ className }: TaglineProps) {
  return <p className={cn("text-xs font-medium text-muted-foreground", className)}>From papers to production.</p>;
}
