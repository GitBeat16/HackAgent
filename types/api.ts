/**
 * API contracts. Route handlers under `app/api` build responses
 * shaped like these; feature `service.ts` files (client side) parse
 * responses typed as these. Keep this file the single source of truth —
 * if a field changes here, both sides feel it via a type error, not a
 * silent runtime mismatch.
 */

export interface ApiError {
  error: string;
  /** Machine-readable code for client-side branching (e.g. "NOT_FOUND"). */
  code?: string;
}

// ---- Pitches / meetings ----------------------------------------------

export interface CreatePitchRequest {
  startupName: string;
  oneLiner: string;
  industry: string;
  stage: string;
  pitch: string;
  /** Executive persona ids to seat for this session — see lib/ai/executives.ts. */
  executiveIds: string[];
}

export interface CreatePitchResponse {
  meetingId: string;
  status: "queued" | "in-progress";
}

export type MeetingStatus = "scheduled" | "in-progress" | "completed";

/**
 * Fact-check outcome for a single turn.
 *
 * Present only on turns that had retrieved evidence to check against, which
 * is a small minority. Absent means "never checked", which is deliberately
 * distinct from "checked and clean".
 */
export interface MessageVerification {
  /** Figures that appear in a retrieved source. */
  supported: string[];
  /** Figures the executive stated that no source backs. */
  unsupported: string[];
  checked: boolean;
}

export interface MeetingTranscriptMessage {
  id: string;
  speakerId: string;
  speakerName: string;
  role: string;
  message: string;
  createdAt: string;
  verification?: MessageVerification;
}

export type BoardVote = "yes" | "no" | "conditional";

export interface MeetingResponse {
  id: string;
  startupName: string;
  oneLiner: string;
  industry: string;
  stage: string;
  status: MeetingStatus;
  /** Seated persona ids, in seating order — see lib/ai/executives.ts. */
  executiveIds: string[];
  transcript: MeetingTranscriptMessage[];
  /** Present once at least one executive has voted. */
  votes?: Record<string, BoardVote>;
  /** Present once the session has produced a final report. */
  reportId?: string;
}

export interface AdvanceDebateRequest {
  /** Optional founder reply to the board's last question — omit to let the next executive speak unprompted. */
  founderMessage?: string;
}

/**
 * Why the board handed the floor to whoever just spoke.
 *
 * Returned per turn so the UI can show the reasoning rather than just the
 * outcome — the selection being explainable is most of what distinguishes
 * orchestration from a shuffle.
 */
export interface SpeakerSelectionInfo {
  phase: "opening" | "cross_examination" | "closing";
  topic: string;
  /** 0–1 certainty in the topic read. Low means fairness decided the turn. */
  topicConfidence: number;
  /** Best-scoring candidates, highest first. */
  ranking: Array<{
    executiveId: string;
    score: number;
    relevance: number;
    fairness: number;
    founderMention: number;
    disagreement: number;
  }>;
}

export interface AdvanceDebateResponse {
  /** The founder's own turn, echoed back when `founderMessage` was sent, so the client can persist the real id. */
  founderMessage?: MeetingTranscriptMessage;
  /** Null once every seated executive has taken all of their turns. */
  message: MeetingTranscriptMessage | null;
  /** True once the debate is over and the session is ready to be finalized. */
  isComplete: boolean;
  /** Absent on the turn that ends the debate, since nobody was selected. */
  selection?: SpeakerSelectionInfo;
  /**
   * Set when the turn ended on a question aimed at the founder. The client
   * holds the debate here so the founder can answer before the board moves on.
   */
  founderQuestion?: string;
}

export interface FinalizeMeetingResponse {
  reportId: string;
  investmentScore: number;
  verdict: "Strong buy" | "Conditional" | "Pass";
  votes: Record<string, BoardVote>;
  /** False when the report saved but the studio deliverables could not be regenerated. */
  deliverablesRefreshed: boolean;
}

// ---- Reports ------------------------------------------------------------

export interface ReportListResponse {
  reports: Array<{
    id: string;
    startupName: string;
    oneLiner: string;
    industry: string;
    investmentScore: number;
    verdict: "Strong buy" | "Conditional" | "Pass";
    generatedAt: string;
  }>;
}

// Full report detail reuses features/reports/types.ts's ReportDetail shape
// server-side — see lib/server/reports.ts.

// ---- Executives -----------------------------------------------------------

export interface ExecutiveListResponse {
  executives: Array<{
    id: string;
    name: string;
    role: string;
    trait: string;
    bio: string;
    focusAreas: string[];
  }>;
}

// ---- History --------------------------------------------------------------

export interface HistoryListResponse {
  entries: Array<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
    changeType: "Report" | "Pitch deck" | "PRD" | "Financials";
  }>;
}
