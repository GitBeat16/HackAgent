import { NextResponse } from "next/server";
import { getLatestMeeting } from "@/lib/server/meetings";
import { requireUser } from "@/lib/server/auth";
import type { MeetingResponse } from "@/types/api";

/**
 * What `/boardroom` loads when it is opened without a `?meeting=` id —
 * an unfinished session if there is one, otherwise the most recent.
 * Returns `{ meeting: null }` rather than a 404 so a new user with no
 * sessions yet is a normal empty state, not an error.
 */
export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const meeting = await getLatestMeeting(user.id);
  if (!meeting) return NextResponse.json<{ meeting: null }>({ meeting: null });

  const { pitch: _pitch, ...payload } = meeting;
  return NextResponse.json<{ meeting: MeetingResponse }>({ meeting: payload });
}
