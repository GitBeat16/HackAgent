import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";

/**
 * Type system — two roles, deliberately paired:
 *
 * - Display (Fraunces): a soft, high-contrast serif with real optical-size
 *   variation. Carries the "boardroom" gravitas on headlines and big
 *   figures. Used with restraint — never body copy, never UI chrome.
 * - Sans (Inter): a neutral, dense-friendly grotesk for UI labels, nav,
 *   forms, and body copy. Chosen for legibility at small sizes across a
 *   data-heavy dashboard, not for personality.
 * - Mono (JetBrains Mono): reserved for figures that must read as *data* —
 *   financials, timestamps, IDs, deltas — so a $ amount never gets mistaken
 *   for editorial copy.
 */

export const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  weight: "variable",
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const fontVariables = `${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`;
