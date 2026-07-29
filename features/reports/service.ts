import type { ReportListResponse } from "@/types/api";
import type { ReportDetail } from "@/features/reports/types";

export async function fetchReports(): Promise<ReportListResponse["reports"]> {
  const res = await fetch("/api/reports", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load reports (${res.status})`);
  const data = (await res.json()) as ReportListResponse;
  return data.reports;
}

export async function fetchReport(id: string): Promise<ReportDetail | null> {
  const res = await fetch(`/api/reports/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load report ${id} (${res.status})`);
  return (await res.json()) as ReportDetail;
}
