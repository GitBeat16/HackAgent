import { NextResponse } from "next/server";
import { createMeeting } from "@/lib/server/meetings";
import { requireUser } from "@/lib/server/auth";
import { logActivity } from "@/lib/server/activity";
import { executivePersonas } from "@/lib/ai/executives";
import type { CreatePitchRequest, CreatePitchResponse, ApiError } from "@/types/api";

const KNOWN_EXECUTIVE_IDS = new Set(executivePersonas.map((persona) => persona.id));

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;
  const body = (await request.json().catch(() => ({}))) as Partial<CreatePitchRequest>;

  if (!body.startupName || !body.oneLiner || !body.pitch || !body.executiveIds?.length) {
    return NextResponse.json<ApiError>(
      { error: "startupName, oneLiner, pitch, and at least one executiveId are required.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  // Seat ids drive persona lookup during the debate, where an unknown id
  // would throw mid-session. Reject it here instead.
  const executiveIds = [...new Set(body.executiveIds)].filter((id) => KNOWN_EXECUTIVE_IDS.has(id));
  if (!executiveIds.length) {
    return NextResponse.json<ApiError>(
      { error: "No recognised executive ids were provided.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  const { meetingId } = await createMeeting(user.id, {
    startupName: body.startupName,
    oneLiner: body.oneLiner,
    industry: body.industry ?? "other",
    stage: body.stage ?? "seed",
    pitch: body.pitch,
    executiveIds,
  });

  await logActivity(user.id, {
    title: `${body.startupName} board session started`,
    description: `${executiveIds.length} of ${executivePersonas.length} executives seated to evaluate this pitch.`,
    tone: "signal",
    changeType: "Report",
  });

  // The client drives the debate turn by turn from /boardroom so the
  // founder sees each executive arrive live — see
  // features/boardroom/components/boardroom-session.tsx.
  return NextResponse.json<CreatePitchResponse>({ meetingId, status: "in-progress" }, { status: 201 });
}
