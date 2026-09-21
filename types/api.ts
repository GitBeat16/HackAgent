/**
 * API contracts. Route handlers under `app/api` build responses
 * shaped like these; feature `service.ts` files (client side) parse
 * responses typed as these. Keep this file the single source of truth â€”
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
  /** Executive persona ids to seat for this session â€” see lib/ai/executives.ts. */
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
  /** Seated persona ids, in seating order â€” see lib/ai/executives.ts. */
  executiveIds: string[];
  transcript: MeetingTranscriptMessage[];
  /** Present once at least one executive has voted. */
  votes?: Record<string, BoardVote>;
  /** Present once the session has produced a final report. */
  reportId?: string;
}

export interface AdvanceDebateRequest {
  /** Optional founder reply to the board's last question â€” omit to let the next executive speak unprompted. */
  founderMessage?: string;
}

/**
 * Why the board handed the floor to whoever just spoke.
 *
 * Returned per turn so the UI can show the reasoning rather than just the
 * outcome â€” the selection being explainable is most of what distinguishes
 * orchestration from a shuffle.
 */
export interface SpeakerSelectionInfo {
  phase: "opening" | "cross_examination" | "closing";
  topic: string;
  /** 0â€“1 certainty in the topic read. Low means fairness decided the turn. */
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
// server-side â€” see lib/server/reports.ts.

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
import { z } from 'zod';

export type UserRole = "startup_founder" | "department_officer" | "platform_admin";

export const CreateChallengeRequestSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(5000),
  domain: z.enum(['transport', 'agriculture', 'health', 'education', 'urban', 'other', 'technology']),
  budgetInr: z.number().int().positive().optional(),
  deadline: z.string().datetime().optional(),
  eligibilityNotes: z.string().optional()
});
export type CreateChallengeRequest = z.infer<typeof CreateChallengeRequestSchema>;

export interface ChallengeDetailResponse {
  id: string;
  departmentId: string;
  title: string;
  description: string;
  domain: string;
  budgetInr?: number;
  deadline?: string;
  eligibilityNotes?: string;
  status: 'draft'|'open'|'closed'|'archived';
  createdAt: string;
}

export interface ChallengeListResponse {
  challenges: ChallengeDetailResponse[];
}

export const CreateProposalRequestSchema = z.object({
  proposalText: z.string().min(200).max(5000),
});
export type CreateProposalRequest = z.infer<typeof CreateProposalRequestSchema>;

export interface ProposalDetailResponse {
  id: string;
  challengeId: string;
  startupId: string;
  status: 'submitted'|'evaluating'|'evaluated'|'approved'|'rejected'|'pilot_active'|'completed'|'archived';
  proposalText: string;
  aiMatchScore?: number;
  meetingId?: string;
  reportId?: string;
  submittedAt: string;
}

export interface ProposalListResponse {
  proposals: ProposalDetailResponse[];
}

export const ApproveProposalRequestSchema = z.object({
  milestones: z.array(z.object({
    title: z.string(),
    description: z.string(),
    paymentInr: z.number().int().positive(),
    dueDate: z.string().datetime().optional()
  }))
});
export type ApproveProposalRequest = z.infer<typeof ApproveProposalRequestSchema>;

export const RejectProposalRequestSchema = z.object({
  reason: z.string()
});
export type RejectProposalRequest = z.infer<typeof RejectProposalRequestSchema>;

export interface MilestoneDetail {
  id: string;
  proposalId: string;
  title: string;
  description: string;
  paymentInr: number;
  dueDate?: string;
  status: 'pending'|'evidence_submitted'|'approved'|'rejected';
  evidenceUrl?: string;
}

export interface MilestoneListResponse {
  milestones: MilestoneDetail[];
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  createdAt: string;
}

export interface AuditLogListResponse {
  logs: AuditLogEntry[];
}
