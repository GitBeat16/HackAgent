import { NextResponse } from "next/server";
import { getMeeting } from "@/lib/server/meetings";
import { requireUser } from "@/lib/server/auth";
import type { MeetingResponse, ApiError } from "@/types/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const { id } = await params;
  const meeting = await getMeeting(id);

  if (!meeting) {
    return NextResponse.json<ApiError>({ error: "Meeting not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // The pitch text itself stays server-side — the boardroom renders the
  // transcript, not the original submission.
  const { pitch: _pitch, ...payload } = meeting;
  return NextResponse.json<MeetingResponse>(payload);
}
