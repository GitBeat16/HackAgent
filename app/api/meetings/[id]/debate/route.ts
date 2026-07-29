import { NextResponse } from "next/server";
import { getMeeting, appendTranscriptMessage } from "@/lib/server/meetings";
import { advanceDebate, founderMessage as buildFounderMessage, isDebateComplete } from "@/lib/ai/board-orchestrator";
import { executivePersonas } from "@/lib/ai/executives";
import { requireUser } from "@/lib/server/auth";
import { isAiConfigured } from "@/lib/server/env";
import { GroqError } from "@/lib/ai/groq";
import type { AdvanceDebateRequest, AdvanceDebateResponse, ApiError } from "@/types/api";

/** One Groq turn is fast, but the platform default timeout is tighter than this. */
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (!user) return response;

  if (!isAiConfigured()) {
    return NextResponse.json<ApiError>(
      { error: "Add GROQ_API_KEY to .env.local to run a live board session.", code: "AI_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as AdvanceDebateRequest;

  const meeting = await getMeeting(id);
  if (!meeting) {
    return NextResponse.json<ApiError>({ error: "Meeting not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const seatedExecutiveIds = meeting.executiveIds.length
    ? meeting.executiveIds
    : executivePersonas.map((persona) => persona.id);

  // Persist the founder's turn before generating a reply, so their message
  // survives a reload even if the model call then fails.
  const founderTurn = body.founderMessage?.trim() ? buildFounderMessage(body.founderMessage) : null;
  if (founderTurn) await appendTranscriptMessage(id, founderTurn);

  const state = {
    meetingId: meeting.id,
    startupName: meeting.startupName,
    oneLiner: meeting.oneLiner,
    industry: meeting.industry,
    stage: meeting.stage,
    pitch: meeting.pitch,
    seatedExecutiveIds,
    transcript: founderTurn ? [...meeting.transcript, founderTurn] : meeting.transcript,
  };

  if (isDebateComplete(state)) {
    return NextResponse.json<AdvanceDebateResponse>({
      ...(founderTurn ? { founderMessage: founderTurn } : {}),
      message: null,
      isComplete: true,
    });
  }

  try {
    const result = await advanceDebate(state);
    if (result.message) await appendTranscriptMessage(id, result.message);

    return NextResponse.json<AdvanceDebateResponse>({
      ...(founderTurn ? { founderMessage: founderTurn } : {}),
      message: result.message,
      isComplete: result.isComplete,
      ...(result.founderQuestion ? { founderQuestion: result.founderQuestion } : {}),
      ...(result.selection
        ? {
            selection: {
              phase: result.selection.phase,
              topic: result.selection.topic.topic,
              topicConfidence: result.selection.topic.confidence,
              ranking: result.selection.scores.map((entry) => ({
                executiveId: entry.executiveId,
                score: Math.round(entry.score * 100) / 100,
                relevance: entry.parts.relevance,
                fairness: entry.parts.fairness,
                founderMention: entry.parts.founderMention,
                disagreement: entry.parts.disagreement,
              })),
            },
          }
        : {}),
    });
  } catch (error) {
    const isUpstream = error instanceof GroqError;
    return NextResponse.json<ApiError>(
      {
        error: error instanceof Error ? error.message : "The board could not respond.",
        code: isUpstream ? "AI_REQUEST_FAILED" : "DEBATE_FAILED",
      },
      // 502: the request was fine, the upstream model call was not.
      { status: isUpstream ? 502 : 500 },
    );
  }
}
