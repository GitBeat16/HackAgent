import { NextResponse } from "next/server";
import { listExecutives } from "@/lib/server/executives";
import { requireUser } from "@/lib/server/auth";
import type { ExecutiveListResponse } from "@/types/api";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const executives = await listExecutives();
  return NextResponse.json<ExecutiveListResponse>({ executives });
}
