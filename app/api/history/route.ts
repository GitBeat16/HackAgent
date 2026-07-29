import { NextResponse } from "next/server";
import { listHistory } from "@/lib/server/history";
import { requireUser } from "@/lib/server/auth";
import type { HistoryListResponse } from "@/types/api";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const entries = await listHistory(user.id);
  return NextResponse.json<HistoryListResponse>({ entries });
}
