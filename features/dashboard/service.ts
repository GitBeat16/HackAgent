import type { DashboardMetric, RecentMeeting, ActivityItem, ScoreTrendPoint } from "@/features/dashboard/types";

export interface DashboardResponse {
  metrics: DashboardMetric[];
  recentMeetings: RecentMeeting[];
  recentActivity: ActivityItem[];
  scoreTrend: ScoreTrendPoint[];
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch("/api/dashboard", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load dashboard (${res.status})`);
  return (await res.json()) as DashboardResponse;
}
