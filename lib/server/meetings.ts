import { createClient } from "@/lib/supabase/server";
import type { CreatePitchRequest, MeetingResponse, MeetingTranscriptMessage, MessageVerification } from "@/types/api";
import type { BoardVote, ExecutiveVoteDetail } from "@/types/report";

type MeetingRow = {
  id: string;
  startup_name: string;
  one_liner: string;
  industry: string;
  stage: string;
  status: "scheduled" | "in-progress" | "completed";
  pitch: string;
  created_at: string;
  meeting_executives: Array<{ executive_id: string; seat_index: number }> | null;
  messages: Array<{
    id: string;
    speaker_id: string;
    speaker_name: string;
    role: string;
    message: string;
    created_at: string;
    verification?: MessageVerification;
  }> | null;
  votes: Array<{ executive_id: string; vote: BoardVote }> | null;
  reports: { id: string } | Array<{ id: string }> | null;
};

type VoteRow = { executive_id: string; vote: BoardVote };

export interface MeetingDetail extends MeetingResponse {
  pitch: string;
  oneLiner: string;
  industry: string;
  stage: string;
  executiveIds: string[];
}

const MEETING_SELECT = "id, startup_name, one_liner, industry, stage, status, pitch, created_at, meeting_executives(executive_id, seat_index), messages(id, speaker_id, speaker_name, role, message, created_at, verification), votes(executive_id, vote), reports(id)";

function firstReportId(reports: MeetingRow["reports"]) {
  if (!reports) return undefined;
  return Array.isArray(reports) ? reports[0]?.id : reports.id;
}

function toDetail(meeting: MeetingRow): MeetingDetail {
  return {
    id: meeting.id,
    startupName: meeting.startup_name,
    oneLiner: meeting.one_liner,
    industry: meeting.industry,
    stage: meeting.stage,
    pitch: meeting.pitch,
    status: meeting.status,
    transcript: (meeting.messages ?? [])
      .slice()
      .sort((a, b) => a.created_at === b.created_at ? a.id.localeCompare(b.id) : a.created_at.localeCompare(b.created_at))
      .map((message) => ({
        id: message.id,
        speakerId: message.speaker_id,
        speakerName: message.speaker_name,
        role: message.role,
        message: message.message,
        createdAt: message.created_at,
        ...(message.verification ? { verification: message.verification as MessageVerification } : {}),
      })),
    votes: meeting.votes?.length
      ? Object.fromEntries(meeting.votes.map((vote) => [vote.executive_id, vote.vote]))
      : undefined,
    reportId: firstReportId(meeting.reports),
    executiveIds: (meeting.meeting_executives ?? [])
      .slice()
      .sort((a, b) => a.seat_index - b.seat_index)
      .map((seat) => seat.executive_id),
  };
}

export async function createMeeting(userId: string, input: CreatePitchRequest): Promise<{ meetingId: string }> {
  const supabase = await createClient();
  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({ user_id: userId, startup_name: input.startupName, one_liner: input.oneLiner, industry: input.industry, stage: input.stage, pitch: input.pitch, status: "in-progress" })
    .select("id")
    .single();
  if (error || !meeting) throw new Error(error?.message ?? "Could not create meeting.");

  const { error: seatsError } = await supabase.from("meeting_executives").insert(input.executiveIds.map((executiveId, seatIndex) => ({ meeting_id: meeting.id, executive_id: executiveId, seat_index: seatIndex })));
  if (seatsError) throw new Error(seatsError.message);
  return { meetingId: meeting.id };
}

export async function getMeeting(id: string): Promise<MeetingDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("meetings").select(MEETING_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return toDetail(data as unknown as MeetingRow);
}

export async function getLatestMeeting(userId: string): Promise<MeetingDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(MEETING_SELECT)
    .eq("user_id", userId)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;
  return toDetail(data[0] as unknown as MeetingRow);
}

export async function appendTranscriptMessage(meetingId: string, message: MeetingTranscriptMessage) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .insert({
      id: message.id,
      meeting_id: meetingId,
      speaker_id: message.speakerId,
      speaker_name: message.speakerName,
      role: message.role,
      message: message.message,
      created_at: message.createdAt,
      verification: message.verification ?? null 
    });
  if (error) throw new Error(error.message);
}

export async function recordVotes(meetingId: string, votes: ExecutiveVoteDetail[]) {
  if (!votes.length) return;
  const supabase = await createClient();

  const detail = votes.map((vote) => ({
    meeting_id: meetingId,
    executive_id: vote.executiveId,
    vote: vote.vote,
    rationale: vote.rationale,
    confidence: vote.confidence,
    biggest_risk: vote.biggestRisk,
    biggest_strength: vote.biggestStrength,
    required_milestone: vote.requiredMilestone,
  }));

  const { error } = await supabase.from("votes").upsert(detail, { onConflict: "meeting_id,executive_id" });
  if (error) throw new Error(error.message);
}

export async function completeMeeting(meetingId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("meetings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", meetingId);
  if (error) throw new Error(error.message);
}
