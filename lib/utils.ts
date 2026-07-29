import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving Tailwind conflicts sanely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact currency formatting for financial figures ($1.2M, $840K). */
export function formatCompactCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Standard number formatting with grouping (12,400). */
export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Signed percentage formatting for deltas (+12.4%, -3.1%). */
export function formatSignedPercent(value: number, fractionDigits = 1) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

/** Relative date label without pulling in a date library for a simple case. */
export function formatRelativeTime(date: Date, now: Date = new Date()) {
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

/** Deterministic initials for avatar fallbacks ("Alicia Reyes" -> "AR"). */
export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

/** Clamp a number between a min and max — used by score/confidence meters. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
