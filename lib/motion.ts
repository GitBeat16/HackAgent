import type { Easing, Variants } from "framer-motion";

/**
 * Central motion tokens. Every animated component should reach for these
 * instead of inventing new easing curves — that's how the app avoids the
 * "everything animates slightly differently" tell of generated UI.
 */

export const EMPHASIZED_EASE: Easing = [0.16, 1, 0.3, 1];
export const STANDARD_EASE: Easing = [0.4, 0, 0.2, 1];

export const DURATION = {
  fast: 0.15,
  base: 0.3,
  slow: 0.5,
  deliberate: 0.8,
} as const;

/** Fade + slight rise — the default entrance for cards, panels, list rows. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EMPHASIZED_EASE },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: STANDARD_EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.base, ease: EMPHASIZED_EASE },
  },
};

/** Parent wrapper for staggered children — apply `fadeUp` to each child. */
export const staggerContainer = (staggerChildren = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren, delayChildren },
  },
});

/** Hover-lift used on interactive cards — pairs with `shadow-lg` on hover. */
export const hoverLift = {
  rest: { y: 0 },
  hover: { y: -3, transition: { duration: DURATION.fast, ease: STANDARD_EASE } },
};

/** Page-level transition wrapper for route changes. */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EMPHASIZED_EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: STANDARD_EASE } },
};

/** Respect prefers-reduced-motion by collapsing motion variants to opacity-only. */
export function withReducedMotion(variants: Variants, reduced: boolean): Variants {
  if (!reduced) return variants;
  const stripped: Variants = {};
  for (const key of Object.keys(variants)) {
    const entry = variants[key];
    if (typeof entry === "object") stripped[key] = { opacity: (entry as { opacity?: number }).opacity ?? 1 };
    else if (entry) stripped[key] = entry;
  }
  return stripped;
}
