import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/server/dashboard";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const data = await getDashboardData(user.id);
  return NextResponse.json(data);
}
