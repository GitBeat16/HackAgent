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
import { loadSources } from "@/lib/server/research-store";
import { generateDeliverables } from "@/lib/ai/deliverables";
import { executivePersonas } from "@/lib/ai/executives";
import { completeMeeting, getMeeting, recordVotes, type MeetingDetail } from "@/lib/server/meetings";
import { createReport } from "@/lib/server/reports";
import { updateWorkspaceField } from "@/lib/server/workspace";
import { logActivity } from "@/lib/server/activity";

export interface FinalizeResult {
  reportId: string;
  investmentScore: number;
  verdict: "Strong buy" | "Conditional" | "Pass";
  votes: Record<string, "yes" | "no" | "conditional">;
  /** False when the report saved but the studio artefacts could not be regenerated. */
  deliverablesRefreshed: boolean;
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
    // Read back from the database rather than a process cache. On serverless
    // this call can land in a different instance from the debate turns, so
    // in-memory state would return nothing and the citations would silently
    // vanish in production while working perfectly on localhost.
    sources: await loadSources(meetingId),
  });

  // Report and votes first: they are the session's actual output, and they
  // must land even if deliverable generation later fails.
  const reportId = await createReport(userId, meetingId, report);
  await recordVotes(meetingId, votes);
  await completeMeeting(meetingId);

  await logActivity(userId, {
    title: `${report.startupName} scored ${report.investmentScore}/100`,
    description: `The board returned "${report.verdict}". ${report.executiveSummary}`.slice(0, 400),
    tone: report.verdict === "Strong buy" ? "success" : report.verdict === "Pass" ? "warning" : "signal",
    changeType: "Report",
  });

  let deliverablesRefreshed = false;
  try {
    const deliverables = await generateDeliverables({
      startupName: meeting.startupName,
      oneLiner: meeting.oneLiner,
      industry: meeting.industry,
      stage: meeting.stage,
      pitch: meeting.pitch,
      investmentScore: report.investmentScore,
      transcript: meeting.transcript,
    });

    await Promise.all([
      updateWorkspaceField(userId, "market_research", deliverables.marketResearch),
      updateWorkspaceField(userId, "financials", deliverables.financials),
      updateWorkspaceField(userId, "startup_health", deliverables.startupHealth),
      updateWorkspaceField(userId, "prd_document", deliverables.prdDocument),
      updateWorkspaceField(userId, "pitch_deck", deliverables.pitchDeck),
    ]);

    deliverablesRefreshed = true;

    await logActivity(userId, {
      title: `Deliverables regenerated for ${meeting.startupName}`,
      description: "Market research, financial model, health snapshot, PRD and pitch deck were rebuilt from this session.",
      tone: "brass",
      changeType: "Pitch deck",
    });
  } catch {
    // The report is the contract; the studio artefacts are a bonus. Leaving
    // the previous ones in place beats failing a completed session.
  }

  return {
    reportId,
    investmentScore: report.investmentScore,
    verdict: report.verdict,
    votes: Object.fromEntries(votes.map((vote) => [vote.executiveId, vote.vote])),
    deliverablesRefreshed,
  };
}
