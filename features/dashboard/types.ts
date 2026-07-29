import type { TrendValue } from "@/types/common";

export interface DashboardMetric {
  label: string;
  value: string;
  trend: TrendValue;
}

export interface RecentMeeting {
  id: string;
  startupName: string;
  oneLiner: string;
  status: "in-progress" | "completed" | "scheduled";
  investmentScore?: number;
  /** Set once the session produced a report — report ids differ from meeting ids. */
  reportId?: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: "brass" | "signal" | "success" | "warning";
}

export interface ScoreTrendPoint {
  month: string;
  score: number;
}
