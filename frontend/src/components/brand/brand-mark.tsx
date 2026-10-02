import { cn } from "@/lib/utils/cn";

interface BrandMarkProps {
  /** Pixel size of the square tile. */
  size?: number;
  className?: string;
  /** Retained for API compatibility - the mark no longer animates on hover in either mode. */
  interactive?: boolean;
}

/**
 * Research2Code's mark: three ascending bars inside a squared tile - an
 * abstract "progress/pipeline" glyph (raw research building up into
 * structured code), not a literal book/brackets/robot. Flat fill, no glow,
 * simple enough to read at favicon size.
 */
export function BrandMark({ size = 28, className }: BrandMarkProps) {
  return (
    <div
      className={cn("relative flex shrink-0 items-center justify-center rounded-[22%] bg-primary", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width="58%" height="58%" fill="none" aria-hidden="true">
        <rect x="2" y="13" width="5" height="8" rx="1" fill="white" />
        <rect x="9" y="8" width="5" height="13" rx="1" fill="white" />
        <rect x="16" y="3" width="5" height="18" rx="1" fill="white" />
      </svg>
    </div>
  );
}
