export interface HealthFlag {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
}

export interface HealthDimension {
  dimension: string;
  score: number;
  // Radar charts accept arbitrary series keys alongside `dimension`, so this
  // stays structurally compatible with `RadarSeriesDatum`.
  [seriesKey: string]: string | number;
}
