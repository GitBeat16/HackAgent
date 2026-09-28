/**
 * Closes out a board session: collects votes, writes the report, refreshes
 * the workspace deliverables and marks the meeting complete.
 *
 * This is the step that turns a transcript into everything the rest of the
 * app reads — `/reports`, the dashboard metrics, `/market-research`,
 * `/financials`, `/startup-health`, `/prd-generator` and `/pitch-deck` all
 * render what this function persists.
 */

import { generateVerdict } from "@/lib/ai/report-generator";
import { executivePersonas } from "@/lib/ai/executives";
import { completeMeeting, getMeeting, recordVotes, type MeetingDetail } from "@/lib/server/meetings";
import { createReport } from "@/lib/server/reports";

export interface FinalizeResult {
  reportId: string;
  feasibilityScore: number;
  verdict: "Recommend Pilot" | "Conditional Pilot" | "Reject";
  votes: Record<string, "yes" | "no" | "conditional">;
}

function seatedIds(meeting: MeetingDetail) {
  return meeting.executiveIds.length ? meeting.executiveIds : executivePersonas.map((persona) => persona.id);
}

export async function finalizeMeeting(userId: string, meetingId: string): Promise<FinalizeResult> {
  const meeting = await getMeeting(meetingId);
  if (!meeting) throw new Error("Meeting not found.");

  const { votes, report } = await generateVerdict({
    startupName: meeting.startupName,
    oneLiner: meeting.oneLiner,
    industry: meeting.industry,
    stage: meeting.stage,
    pitch: meeting.pitch,
    seatedExecutiveIds: seatedIds(meeting),
    transcript: meeting.transcript,
    sources: [],
  });

  const reportId = await createReport(userId, meetingId, report);
  await recordVotes(meetingId, votes);
  await completeMeeting(meetingId);

  return {
    reportId,
    feasibilityScore: report.investmentScore,
    verdict: report.verdict,
    votes: Object.fromEntries(votes.map((vote) => [vote.executiveId, vote.vote])),
  };
}
