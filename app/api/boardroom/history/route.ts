import { NextResponse } from "next/server";
import { listPastMeetings } from "@/lib/server/dashboard";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;
  const sessions = await listPastMeetings(user.id);
  return NextResponse.json({ sessions });
}
