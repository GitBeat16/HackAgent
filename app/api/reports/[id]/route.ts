import { NextResponse } from "next/server";
import { getReport } from "@/lib/server/reports";
import { requireUser } from "@/lib/server/auth";
import type { ApiError } from "@/types/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await params;
  const report = await getReport(user.id, id);

  if (!report) {
    return NextResponse.json<ApiError>({ error: "Report not found", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(report);
}
