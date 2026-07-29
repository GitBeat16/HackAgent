import { NextResponse } from "next/server";
import { listReports } from "@/lib/server/reports";
import { requireUser } from "@/lib/server/auth";
import type { ReportListResponse } from "@/types/api";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const reports = await listReports(user.id);
  return NextResponse.json<ReportListResponse>({ reports });
}
