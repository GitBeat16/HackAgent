/**
 * JS-side mirror of the CSS custom properties in `app/globals.css`.
 * Tailwind classes should always be preferred in components — this file
 * exists only for contexts that need a raw color string, e.g. Recharts
 * `stroke`/`fill` props, canvas drawing, or SVG gradients built in JS.
 *
 * Keep in sync with globals.css by hand; there are few enough tokens that a
 * build-time generator would be overkill for this project's size.
 */

export const chartColors = {
  brass: "hsl(32 42% 58%)",
  signal: "hsl(217 79% 66%)",
  success: "hsl(152 48% 45%)",
  violet: "hsl(280 45% 68%)",
  warning: "hsl(38 88% 58%)",
} as const;

export const chartSeriesOrder = [
  chartColors.brass,
  chartColors.signal,
  chartColors.success,
  chartColors.violet,
  chartColors.warning,
] as const;

export const toneColors = {
  brass: { fg: "hsl(32 42% 58%)", bg: "hsl(32 30% 30% / 0.35)" },
  signal: { fg: "hsl(217 79% 66%)", bg: "hsl(217 40% 28% / 0.35)" },
  success: { fg: "hsl(152 48% 45%)", bg: "hsl(152 40% 22% / 0.35)" },
  warning: { fg: "hsl(38 88% 58%)", bg: "hsl(38 60% 22% / 0.35)" },
  destructive: { fg: "hsl(356 72% 58%)", bg: "hsl(356 50% 22% / 0.35)" },
  muted: { fg: "hsl(220 10% 62%)", bg: "hsl(222 14% 16% / 0.6)" },
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
} as const;
