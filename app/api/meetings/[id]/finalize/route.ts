import { NextResponse } from "next/server";
import { finalizeMeeting } from "@/lib/server/board-session";
import { getMeeting } from "@/lib/server/meetings";
import { getReport } from "@/lib/server/reports";
import { requireUser } from "@/lib/server/auth";
import { isAiConfigured } from "@/lib/server/env";
import { GroqError } from "@/lib/ai/groq";
import type { ApiError, FinalizeMeetingResponse } from "@/types/api";

/** Two model calls (verdict, then deliverables) plus the writes behind them. */
export const maxDuration = 120;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;

  if (!isAiConfigured()) {
    return NextResponse.json<ApiError>(
      { error: "Add GROQ_API_KEY to .env.local to generate a board report.", code: "AI_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) {
    return NextResponse.json<ApiError>({ error: "Meeting not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Idempotent: a session that already produced a report just returns it,
  // so a double-click or a retry does not bill a second generation.
  if (meeting.reportId && meeting.status === "completed") {
    const existing = await getReport(user.id, meeting.reportId);
    if (existing) {
      return NextResponse.json<FinalizeMeetingResponse>({
        reportId: existing.id,
        investmentScore: existing.investmentScore,
        verdict: existing.verdict,
        votes: meeting.votes ?? {},
        deliverablesRefreshed: false,
      });
    }
  }

  try {
    return NextResponse.json<FinalizeMeetingResponse>(await finalizeMeeting(user.id, id));
  } catch (error) {
    const isUpstream = error instanceof GroqError;
    return NextResponse.json<ApiError>(
      {
        error: error instanceof Error ? error.message : "Could not generate the board's report.",
        code: isUpstream ? "AI_REQUEST_FAILED" : "FINALIZE_FAILED",
      },
      { status: isUpstream ? 502 : 500 },
    );
  }
}
