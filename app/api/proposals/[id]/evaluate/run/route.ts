import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";
import { getMeeting, appendTranscriptMessage } from "@/lib/server/meetings";
import { advanceDebate } from "@/lib/ai/board-orchestrator";
import { finalizeMeeting } from "@/lib/server/board-session";
import { recordEvaluationResult } from "@/lib/server/procurement";
import { getErrorMessage } from "@/lib/server/errors";

/** Give Vercel enough time to run 10 sequential Groq calls + finalization. */
export const maxDuration = 120;

/**
 * POST /api/proposals/[id]/evaluate/run
 *
 * Runs the full 5-persona debate (10 turns), finalizes the meeting to produce
 * a verdict + report, then writes the AI score and report_id back to
 * procurement_proposals — completing the evaluation loop.
 *
 * Called by the pipeline board AFTER /evaluate has queued the job and
 * returned a meetingId.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRole("department_officer");
  if (response) return response;

  const proposalId = (await params).id;

  try {
    const supabase = await createClient();

    // 1. Fetch the proposal to get the linked meeting_id
    const { data: proposal } = await supabase
      .from("procurement_proposals")
      .select("status, meeting_id, challenges!inner(department_id, title, domain)")
      .eq("id", proposalId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const challenge = Array.isArray(proposal.challenges) ? proposal.challenges[0] : proposal.challenges;
    const challengeDept = (challenge as { department_id: string }).department_id;
    if (challengeDept !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (proposal.status !== "evaluating") {
      return NextResponse.json(
        { error: `Cannot run evaluation: proposal is in status "${proposal.status}", expected "evaluating".` },
        { status: 409 },
      );
    }

    if (!proposal.meeting_id) {
      return NextResponse.json(
        { error: "No meeting linked to this proposal. Call /evaluate first." },
        { status: 409 },
      );
    }

    const meetingId = proposal.meeting_id as string;

    // 2. Load the meeting to build the initial DebateState
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
      return NextResponse.json({ error: "Linked meeting not found" }, { status: 404 });
    }

    const seatedExecutiveIds =
      meeting.executiveIds.length > 0
        ? meeting.executiveIds
        : ["domain", "finance", "compliance", "tech", "scale"];

    // 3. Run the debate: 2 turns per executive = 10 total sequential Groq calls.
    //    We keep a mutable transcript copy so each turn sees the growing context.
    let transcript = [...meeting.transcript];

    for (let turn = 0; turn < seatedExecutiveIds.length * 2; turn++) {
      const state = {
        meetingId,
        startupName: meeting.startupName,
        industry: meeting.industry,
        oneLiner: meeting.oneLiner,
        pitch: meeting.pitch,
        seatedExecutiveIds,
        transcript,
      };

      const result = await advanceDebate(state);

      if (result.isComplete || !result.message) break;

      // Persist each turn as it completes so a mid-run crash is recoverable
      await appendTranscriptMessage(meetingId, result.message);
      transcript = [...transcript, result.message];
    }

    // 4. Finalize: generate verdict from the full transcript, write report + votes
    const finalResult = await finalizeMeeting(user.id, meetingId);

    // 5. Write the score and report_id back to procurement_proposals
    await recordEvaluationResult(
      user.id,
      proposalId,
      finalResult.reportId,
      finalResult.feasibilityScore,
    );

    return NextResponse.json({
      success: true,
      verdict: finalResult.verdict,
      score: finalResult.feasibilityScore,
      reportId: finalResult.reportId,
    });
  } catch (err: unknown) {
    console.error("[evaluate/run] error:", err);
    const message = getErrorMessage(err);
    const status = (err as { code?: string })?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
