import type { Variants, Transition, Easing } from "framer-motion";

/** Shared easing curve for the app's "premium" motion feel - a slight overshoot-free deceleration. */
export const EASE_OUT: Easing = [0.16, 1, 0.3, 1];

export const springSnappy: Transition = { type: "spring", stiffness: 420, damping: 32, mass: 0.9 };
export const springSoft: Transition = { type: "spring", stiffness: 220, damping: 26, mass: 1 };

/** Fade + rise entrance for a single element. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.99 },
  show: { opacity: 1, scale: 1, transition: springSnappy },
};

/** Wrap a list container with this, then each child with `fadeInUp`/`staggerItem` for a cascading entrance. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.02 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
};

/**
 * Hoverable cards no longer move - the hover affordance is a border/shadow
 * shift from the `glow-hover` / `interactive-surface` CSS classes. Kept as
 * empty spreads so existing `{...hoverLift}` call sites stay valid.
 */
export const hoverLift = {};

export const tapScale = {};
