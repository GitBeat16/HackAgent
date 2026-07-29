import type { ComponentType } from "react";

/**
 * Cross-feature primitive types. Feature-specific types (Startup, Meeting,
 * Report, ...) belong in `features/<feature>/types.ts`, not here — this file
 * is only for shapes shared by multiple, unrelated features.
 */

export type Status = "idle" | "loading" | "success" | "error";

export type TrendDirection = "up" | "down" | "flat";

export type Sentiment = "positive" | "neutral" | "negative" | "critical";

export type Tone = "brass" | "signal" | "success" | "warning" | "destructive" | "muted";

export interface TrendValue {
  value: number;
  direction: TrendDirection;
  /** Human label for the comparison period, e.g. "vs last quarter". */
  label?: string;
}

export interface ChartDatum {
  label: string;
  value: number;
}

export interface NamedSeries {
  key: string;
  label: string;
  color?: string;
}

export interface TimelineEntry {
  id: string;
  title: string;
  description?: string;
  timestamp: string | Date;
  tone?: Tone;
  icon?: ComponentType<{ className?: string }>;
}
