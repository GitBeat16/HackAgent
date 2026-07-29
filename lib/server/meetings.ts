import { createClient } from "@/lib/supabase/server";
import { isMissingColumn, warnSchemaBehind } from "@/lib/server/schema-drift";
import type { CreatePitchRequest, MeetingResponse, MeetingTranscriptMessage } from "@/types/api";
import type { BoardVote } from "@/lib/ai/report-generator";
import type { ExecutiveVoteDetail } from "@/features/reports/types";

type MeetingRow = {
  id: string;
  startup_name: string;
  one_liner: string;
  industry: string;
  stage: string;
  status: MeetingResponse["status"];
  created_at: string;
  pitch: string;
  meeting_executives: { executive_id: string; seat_index: number }[];
  messages: MessageRow[];
  votes: VoteRow[];
  reports: { id: string }[] | { id: string } | null;
};
type MessageRow = { id: string; speaker_id: string; speaker_name: string; role: string; message: string; created_at: string; verification: MeetingTranscriptMessage["verification"] | null };
type VoteRow = { executive_id: string; vote: BoardVote };

/** Everything a live boardroom session needs to render itself. */
export interface MeetingDetail extends MeetingResponse {
  pitch: string;
  oneLiner: string;
  industry: string;
  stage: string;
  executiveIds: string[];
}

/**
 * Columns every deployment is guaranteed to have.
 *
 * `verification` is deliberately excluded: it arrives with a later migration,
 * and selecting a column that does not exist makes PostgREST reject the whole
 * query. That took the entire boardroom down with a 500 on a database that
 * was merely one migration behind — an optional fact-check field must not be
 * able to do that.
 */
const BASE_MEETING_SELECT =
  "id, startup_name, one_liner, industry, stage, status, pitch, created_at, meeting_executives(executive_id, seat_index), messages(id, speaker_id, speaker_name, role, message, created_at), votes(executive_id, vote), reports(id)";

const MEETING_SELECT = BASE_MEETING_SELECT.replace(
  "message, created_at)",
  "message, created_at, verification)",
);

/**
 * Runs a meetings query with the fact-check column, retrying without it when
 * the database has not been migrated yet.
 *
 * The retry costs one extra round-trip exactly once per stale deployment and
 * buys a working boardroom instead of an error screen. `build` is a callback
 * rather than a query object because a Supabase query builder is single-use.
 */
async function selectMeetings<T>(
  build: (select: string) => PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>,
): Promise<T | null> {
  const full = await build(MEETING_SELECT);
  if (!full.error) return full.data;
  if (!isMissingColumn(full.error)) throw new Error(full.error.message ?? "Could not load meeting.");

  const fallback = await build(BASE_MEETING_SELECT);
  if (fallback.error) throw new Error(fallback.error.message ?? "Could not load meeting.");
  return fallback.data;
}

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
      // Postgres does not guarantee row order without an ORDER BY on the
      // embedded table, and messages created in the same millisecond can
      // tie — id is the stable tiebreak.
      .slice()
      .sort((a, b) =>
        a.created_at === b.created_at ? a.id.localeCompare(b.id) : a.created_at.localeCompare(b.created_at),
      )
      .map((message) => ({
        id: message.id,
        speakerId: message.speaker_id,
        speakerName: message.speaker_name,
        role: message.role,
        message: message.message,
        createdAt: message.created_at,
        // Only set when the turn was actually checked — an absent key and a
        // clean result mean different things to the transcript badge.
        ...(message.verification ? { verification: message.verification } : {}),
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
  const data = await selectMeetings((select) =>
    supabase.from("meetings").select(select).eq("id", id).maybeSingle(),
  );
  if (!data) return null;
  return toDetail(data as unknown as MeetingRow);
}

/**
 * The session the boardroom falls back to when it is opened without a
 * `?meeting=` id — an in-progress one if there is one, else the newest.
 */
export async function getLatestMeeting(userId: string): Promise<MeetingDetail | null> {
  const supabase = await createClient();
  const data = await selectMeetings((select) =>
    supabase
      .from("meetings")
      .select(select)
      .eq("user_id", userId)
      // 'in-progress' sorts before 'scheduled' and 'completed' alphabetically,
      // so an unfinished session wins over a newer finished one.
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1),
  );
  if (!Array.isArray(data) || data.length === 0) return null;
  return toDetail(data[0] as unknown as MeetingRow);
}

export async function appendTranscriptMessage(meetingId: string, message: MeetingTranscriptMessage) {
  const supabase = await createClient();
  const base = {
    id: message.id,
    meeting_id: meetingId,
    speaker_id: message.speakerId,
    speaker_name: message.speakerName,
    role: message.role,
    message: message.message,
    created_at: message.createdAt,
  };

  const { error } = await supabase
    .from("messages")
    .insert({ ...base, verification: message.verification ?? null });
  if (!error) return;

  // Same reasoning as `selectMeetings`: on a database that has not taken the
  // fact-check migration, losing the verification field is acceptable —
  // losing the executive's turn is not.
  if (!isMissingColumn(error)) throw new Error(error.message);
  const retry = await supabase.from("messages").insert(base);
  if (retry.error) throw new Error(retry.error.message);
}

/**
 * Records how each executive voted.
 *
 * The rationale and the per-seat detail arrive with the bootstrap migration,
 * so — as with `verification` above — they are dropped rather than allowed to
 * fail a session that has already finished. The vote itself is what the
 * dashboard counts and what `/reports` shows a split from, and it is in every
 * schema this app has shipped.
 */
export async function recordVotes(meetingId: string, votes: ExecutiveVoteDetail[]) {
  if (!votes.length) return;
  const supabase = await createClient();

  const core = votes.map((vote) => ({
    meeting_id: meetingId,
    executive_id: vote.executiveId,
    vote: vote.vote,
  }));

  const detail = votes.map((vote, index) => ({
    ...core[index]!,
    rationale: vote.rationale,
    confidence: vote.confidence,
    biggest_risk: vote.biggestRisk,
    biggest_strength: vote.biggestStrength,
    required_milestone: vote.requiredMilestone,
    cheque_size: vote.chequeSize,
    return_horizon: vote.returnHorizon,
  }));

  const save = (rows: Array<Record<string, unknown>>) =>
    supabase.from("votes").upsert(rows, { onConflict: "meeting_id,executive_id" });

  const full = await save(detail);
  if (!full.error) return;
  if (!isMissingColumn(full.error)) throw new Error(full.error.message);

  warnSchemaBehind("votes", full.error.message);

  const bare = await save(core);
  if (bare.error) throw new Error(bare.error.message);
}

export async function completeMeeting(meetingId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("meetings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", meetingId);
  if (error) throw new Error(error.message);
}
